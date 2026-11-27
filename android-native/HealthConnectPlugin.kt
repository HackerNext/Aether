package com.aetheros.biometrics.plugins

import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import kotlin.reflect.KClass

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private var pendingPermCall: PluginCall? = null
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>

    private val requiredPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(OxygenSaturationRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)
    )

    override fun load() {
        super.load()
        val contract = PermissionController.createRequestPermissionResultContract()
        permissionLauncher = bridge.registerForActivityResult(contract) { granted ->
            val call = pendingPermCall
            pendingPermCall = null
            if (call != null) {
                val res = JSObject()
                res.put("granted", granted.isNotEmpty())
                res.put("grantedCount", granted.size)
                res.put("totalRequested", requiredPermissions.size)
                call.resolve(res)
            }
        }
    }

    private fun launchPermissionsInternal(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("HEALTH_CONNECT_UNAVAILABLE_STATUS_$status")
            return
        }
        pendingPermCall = call
        activity.runOnUiThread {
            permissionLauncher.launch(requiredPermissions)
        }
    }

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        val available = status == HealthConnectClient.SDK_AVAILABLE
        val statusLabel = when (status) {
            HealthConnectClient.SDK_AVAILABLE -> "AVAILABLE"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "UPDATE_REQUIRED"
            else -> "UNAVAILABLE"
        }
        val result = JSObject()
        result.put("available", available)
        result.put("sdkStatus", status)
        result.put("statusLabel", statusLabel)

        if (!available) {
            result.put("grantedCount", 0)
            result.put("totalRequested", requiredPermissions.size)
            call.resolve(result)
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                result.put("grantedCount", granted.size)
                result.put("totalRequested", requiredPermissions.size)
                call.resolve(result)
            } catch (_: Exception) {
                result.put("grantedCount", 0)
                result.put("totalRequested", requiredPermissions.size)
                call.resolve(result)
            }
        }
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        launchPermissionsInternal(call)
    }

    @PluginMethod
    fun requestHcPermissions(call: PluginCall) {
        launchPermissionsInternal(call)
    }

    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            call.resolve(JSObject().apply { put("opened", true) })
        } catch (ex: Exception) {
            call.reject("OPEN_SETTINGS_FAILED: ${ex.message}")
        }
    }

    /**
     * Safely reads Health Connect records across a time range. If an OEM app
     * (like Mi Fitness) wrote a malformed record with startTime >= endTime,
     * recursively bisects the time window so all valid records are rescued.
     */
    private suspend fun <T : Record> safeReadRecords(
        client: HealthConnectClient,
        recordType: KClass<T>,
        start: Instant,
        end: Instant,
        depth: Int = 0
    ): List<T> {
        if (!start.isBefore(end)) return emptyList()
        return try {
            val collected = mutableListOf<T>()
            var pageToken: String? = null
            do {
                val response = client.readRecords(
                    ReadRecordsRequest(
                        recordType = recordType,
                        timeRangeFilter = TimeRangeFilter.between(start, end),
                        pageToken = pageToken
                    )
                )
                collected.addAll(response.records)
                pageToken = response.pageToken
            } while (pageToken != null)
            collected
        } catch (_: IllegalArgumentException) {
            val spanSec = ChronoUnit.SECONDS.between(start, end)
            if (depth >= 5 || spanSec <= 1800L) {
                emptyList()
            } else {
                val mid = start.plusSeconds(spanSec / 2)
                safeReadRecords(client, recordType, start, mid, depth + 1) +
                    safeReadRecords(client, recordType, mid, end, depth + 1)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private class DayAccumulator(val date: String) {
        var steps: Long = 0
        var activeCalories: Double = 0.0
        var aggRhrBpm: Long? = null
        var aggMinHrBpm: Long? = null
        var aggSleepTotalMin: Int = 0
        val rhrList = mutableListOf<Long>()
        val hrvList = mutableListOf<Double>()
        val spo2List = mutableListOf<Double>()
        val hrByHour = Array(24) { mutableListOf<Long>() }
        var zone1Min = 0
        var zone2Min = 0
        var zone3Min = 0
        var zone4Min = 0
        var zone5Min = 0
        var sleepBedtimeIso: String? = null
        var sleepWakeIso: String? = null
        var deepMin = 0
        var remMin = 0
        var lightMin = 0
        var awakeMin = 0
        var totalSleepFallbackMin = 0
        val workouts = mutableListOf<JSObject>()
        val sources = mutableSetOf<String>()
    }

    @PluginMethod
    fun readBiometricsBundle(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("HEALTH_CONNECT_UNAVAILABLE_STATUS_$status")
            return
        }

        val daysBack = (call.getInt("daysBack", 30) ?: 30).coerceIn(1, 30)
        val maxHr = (call.getInt("maxHrBpm", 195) ?: 195).toDouble()
        val client = HealthConnectClient.getOrCreate(context)
        val zoneId = ZoneId.systemDefault()
        val nowInstant = Instant.now()
        val todayLocal = LocalDate.now(zoneId)
        val startLocal = todayLocal.minusDays((daysBack - 1).toLong()).atStartOfDay()
        val endLocal = LocalDateTime.now(zoneId).plusMinutes(1)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                if (granted.isEmpty()) {
                    call.reject("HEALTH_CONNECT_PERMISSIONS_MISSING")
                    return@launch
                }

                val dayMap = linkedMapOf<String, DayAccumulator>()
                fun getDayByKey(dateKey: String): DayAccumulator =
                    dayMap.getOrPut(dateKey) { DayAccumulator(dateKey) }
                fun getDay(inst: Instant): DayAccumulator =
                    getDayByKey(inst.atZone(zoneId).toLocalDate().toString())

                val allSources = mutableSetOf<String>()
                var rawTotalRecords = 0

                // 1. System-side daily aggregation (immune to malformed individual record timestamps)
                if (granted.contains(HealthPermission.getReadPermission(StepsRecord::class))) {
                    try {
                        val buckets = client.aggregateGroupByPeriod(
                            AggregateGroupByPeriodRequest(
                                metrics = setOf(StepsRecord.COUNT_TOTAL),
                                timeRangeFilter = TimeRangeFilter.between(startLocal, endLocal),
                                timeRangeSlicer = Period.ofDays(1)
                            )
                        )
                        for (b in buckets) {
                            val total = b.result[StepsRecord.COUNT_TOTAL] ?: continue
                            if (total > 0) {
                                val d = getDayByKey(b.startTime.toLocalDate().toString())
                                d.steps = total
                                rawTotalRecords += 1
                                b.result.dataOrigins.forEach {
                                    d.sources.add(it.packageName)
                                    allSources.add(it.packageName)
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }

                if (granted.contains(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class))) {
                    try {
                        val buckets = client.aggregateGroupByPeriod(
                            AggregateGroupByPeriodRequest(
                                metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
                                timeRangeFilter = TimeRangeFilter.between(startLocal, endLocal),
                                timeRangeSlicer = Period.ofDays(1)
                            )
                        )
                        for (b in buckets) {
                            val energy = b.result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL] ?: continue
                            if (energy.inKilocalories > 0) {
                                val d = getDayByKey(b.startTime.toLocalDate().toString())
                                d.activeCalories = energy.inKilocalories
                                rawTotalRecords += 1
                                b.result.dataOrigins.forEach {
                                    d.sources.add(it.packageName)
                                    allSources.add(it.packageName)
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }

                if (granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class))) {
                    try {
                        val buckets = client.aggregateGroupByPeriod(
                            AggregateGroupByPeriodRequest(
                                metrics = setOf(RestingHeartRateRecord.BPM_AVG),
                                timeRangeFilter = TimeRangeFilter.between(startLocal, endLocal),
                                timeRangeSlicer = Period.ofDays(1)
                            )
                        )
                        for (b in buckets) {
                            val bpm = b.result[RestingHeartRateRecord.BPM_AVG] ?: continue
                            val d = getDayByKey(b.startTime.toLocalDate().toString())
                            d.aggRhrBpm = bpm
                            rawTotalRecords += 1
                            b.result.dataOrigins.forEach {
                                d.sources.add(it.packageName)
                                allSources.add(it.packageName)
                            }
                        }
                    } catch (_: Exception) {}
                }

                if (granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class))) {
                    try {
                        val buckets = client.aggregateGroupByPeriod(
                            AggregateGroupByPeriodRequest(
                                metrics = setOf(HeartRateRecord.BPM_MIN),
                                timeRangeFilter = TimeRangeFilter.between(startLocal, endLocal),
                                timeRangeSlicer = Period.ofDays(1)
                            )
                        )
                        for (b in buckets) {
                            val minHr = b.result[HeartRateRecord.BPM_MIN] ?: continue
                            val d = getDayByKey(b.startTime.toLocalDate().toString())
                            d.aggMinHrBpm = minHr
                            b.result.dataOrigins.forEach {
                                d.sources.add(it.packageName)
                                allSources.add(it.packageName)
                            }
                        }
                    } catch (_: Exception) {}
                }

                if (granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class))) {
                    try {
                        val buckets = client.aggregateGroupByPeriod(
                            AggregateGroupByPeriodRequest(
                                metrics = setOf(SleepSessionRecord.SLEEP_DURATION_TOTAL),
                                timeRangeFilter = TimeRangeFilter.between(startLocal, endLocal),
                                timeRangeSlicer = Period.ofDays(1)
                            )
                        )
                        for (b in buckets) {
                            val dur = b.result[SleepSessionRecord.SLEEP_DURATION_TOTAL] ?: continue
                            val mins = dur.toMinutes().toInt()
                            if (mins > 0) {
                                val d = getDayByKey(b.startTime.toLocalDate().toString())
                                d.aggSleepTotalMin = mins
                                rawTotalRecords += 1
                                b.result.dataOrigins.forEach {
                                    d.sources.add(it.packageName)
                                    allSources.add(it.packageName)
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }

                // 2. Per-day isolated record reads for Sleep Stages, HR Zones, SpO2, HRV & Workouts
                for (dayOffset in 0 until daysBack) {
                    val dateObj = todayLocal.minusDays(dayOffset.toLong())
                    val dayStart = dateObj.atStartOfDay(zoneId).toInstant()
                    val dayEndRaw = dateObj.plusDays(1).atStartOfDay(zoneId).toInstant()
                    val dayEnd = if (dayEndRaw.isAfter(nowInstant)) nowInstant else dayEndRaw
                    if (!dayStart.isBefore(dayEnd)) continue

                    if (granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class))) {
                        val recs = safeReadRecords(client, RestingHeartRateRecord::class, dayStart, dayEnd)
                        rawTotalRecords += recs.size
                        for (r in recs) {
                            val d = getDay(r.time)
                            d.rhrList.add(r.beatsPerMinute)
                            val pkg = r.metadata.dataOrigin.packageName
                            d.sources.add(pkg)
                            allSources.add(pkg)
                        }
                    }

                    if (granted.contains(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class))) {
                        val recs = safeReadRecords(client, HeartRateVariabilityRmssdRecord::class, dayStart, dayEnd)
                        rawTotalRecords += recs.size
                        for (r in recs) {
                            val d = getDay(r.time)
                            d.hrvList.add(r.heartRateVariabilityMillis)
                            val pkg = r.metadata.dataOrigin.packageName
                            d.sources.add(pkg)
                            allSources.add(pkg)
                        }
                    }

                    if (granted.contains(HealthPermission.getReadPermission(OxygenSaturationRecord::class))) {
                        val recs = safeReadRecords(client, OxygenSaturationRecord::class, dayStart, dayEnd)
                        rawTotalRecords += recs.size
                        for (r in recs) {
                            val d = getDay(r.time)
                            d.spo2List.add(r.percentage.value)
                            val pkg = r.metadata.dataOrigin.packageName
                            d.sources.add(pkg)
                            allSources.add(pkg)
                        }
                    }

                    if (granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class))) {
                        val recs = safeReadRecords(client, HeartRateRecord::class, dayStart, dayEnd)
                        rawTotalRecords += recs.size
                        for (r in recs) {
                            val pkg = r.metadata.dataOrigin.packageName
                            allSources.add(pkg)
                            for (s in r.samples) {
                                val zdt = s.time.atZone(zoneId)
                                val d = getDay(s.time)
                                d.sources.add(pkg)
                                d.hrByHour[zdt.hour].add(s.beatsPerMinute)
                                val pct = s.beatsPerMinute.toDouble() / maxHr
                                when {
                                    pct >= 0.90 -> d.zone5Min += 1
                                    pct >= 0.80 -> d.zone4Min += 1
                                    pct >= 0.70 -> d.zone3Min += 1
                                    pct >= 0.60 -> d.zone2Min += 1
                                    pct >= 0.50 -> d.zone1Min += 1
                                }
                            }
                        }
                    }

                    if (granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class))) {
                        val recs = safeReadRecords(client, SleepSessionRecord::class, dayStart, dayEnd)
                        rawTotalRecords += recs.size
                        for (session in recs) {
                            val d = getDay(session.endTime)
                            val pkg = session.metadata.dataOrigin.packageName
                            d.sources.add(pkg)
                            allSources.add(pkg)
                            d.sleepBedtimeIso = session.startTime.toString()
                            d.sleepWakeIso = session.endTime.toString()

                            if (session.stages.isNotEmpty()) {
                                for (st in session.stages) {
                                    val mins = ChronoUnit.MINUTES.between(st.startTime, st.endTime).toInt().coerceAtLeast(0)
                                    when (st.stage) {
                                        SleepSessionRecord.STAGE_TYPE_DEEP -> d.deepMin += mins
                                        SleepSessionRecord.STAGE_TYPE_REM -> d.remMin += mins
                                        SleepSessionRecord.STAGE_TYPE_LIGHT,
                                        SleepSessionRecord.STAGE_TYPE_SLEEPING -> d.lightMin += mins
                                        SleepSessionRecord.STAGE_TYPE_AWAKE,
                                        SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED,
                                        SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> d.awakeMin += mins
                                        else -> d.lightMin += mins
                                    }
                                }
                            } else {
                                val totalMins = ChronoUnit.MINUTES.between(session.startTime, session.endTime).toInt().coerceAtLeast(0)
                                d.totalSleepFallbackMin += totalMins
                            }
                        }
                    }

                    if (granted.contains(HealthPermission.getReadPermission(ExerciseSessionRecord::class))) {
                        val recs = safeReadRecords(client, ExerciseSessionRecord::class, dayStart, dayEnd)
                        rawTotalRecords += recs.size
                        for (ex in recs) {
                            val d = getDay(ex.startTime)
                            val pkg = ex.metadata.dataOrigin.packageName
                            d.sources.add(pkg)
                            allSources.add(pkg)
                            val durMin = ChronoUnit.MINUTES.between(ex.startTime, ex.endTime).toInt().coerceAtLeast(1)
                            d.workouts.add(JSObject().apply {
                                put("id", "hc_ex_${ex.startTime.toEpochMilli()}")
                                put("title", ex.title ?: "Workout Session")
                                put("startTime", ex.startTime.toString())
                                put("durationMin", durMin)
                                put("exerciseType", ex.exerciseType)
                                put("source", pkg)
                            })
                        }
                    }
                }

                val daysArray = JSArray()
                for (dateKey in dayMap.keys.sorted()) {
                    val acc = dayMap[dateKey]!!
                    val nightHrSamples = (0..5).flatMap { acc.hrByHour[it] }
                    val rhrValue: Long? = when {
                        acc.rhrList.isNotEmpty() -> acc.rhrList.average().toLong()
                        acc.aggRhrBpm != null -> acc.aggRhrBpm
                        nightHrSamples.size >= 3 -> nightHrSamples.sorted().take(maxOf(1, nightHrSamples.size / 4)).average().toLong()
                        acc.aggMinHrBpm != null -> acc.aggMinHrBpm
                        else -> null
                    }

                    val hourlyArray = JSArray()
                    for (h in 0..23) {
                        val list = acc.hrByHour[h]
                        hourlyArray.put(if (list.isNotEmpty()) list.average().toInt() else 0)
                    }

                    val wArray = JSArray()
                    acc.workouts.forEach { wArray.put(it) }

                    val hasStageSleep = (acc.deepMin + acc.remMin + acc.lightMin) > 0
                    val effectiveLightMin = when {
                        hasStageSleep -> acc.lightMin
                        acc.totalSleepFallbackMin > 0 -> acc.totalSleepFallbackMin
                        acc.aggSleepTotalMin > 0 -> acc.aggSleepTotalMin
                        else -> 0
                    }

                    val dayObj = JSObject().apply {
                        put("date", acc.date)
                        put("steps", acc.steps)
                        put("activeCaloriesKcal", acc.activeCalories.toInt())
                        rhrValue?.let { put("restingHrBpm", it) }
                        if (acc.hrvList.isNotEmpty()) put("overnightHrvMs", acc.hrvList.average())
                        if (acc.spo2List.isNotEmpty()) put("spo2Pct", acc.spo2List.average())
                        put("zone1Min", acc.zone1Min)
                        put("zone2Min", acc.zone2Min)
                        put("zone3Min", acc.zone3Min)
                        put("zone4Min", acc.zone4Min)
                        put("zone5Min", acc.zone5Min)
                        acc.sleepBedtimeIso?.let { put("sleepBedtimeIso", it) }
                        acc.sleepWakeIso?.let { put("sleepWakeIso", it) }
                        put("deepMin", acc.deepMin)
                        put("remMin", acc.remMin)
                        put("lightMin", effectiveLightMin)
                        put("awakeMin", acc.awakeMin)
                        put("hourlyHr", hourlyArray)
                        put("workouts", wArray)
                    }
                    daysArray.put(dayObj)
                }

                val sourcesArr = JSArray()
                allSources.forEach { sourcesArr.put(it) }

                val payload = JSObject().apply {
                    put("syncedAt", nowInstant.toString())
                    put("grantedCount", granted.size)
                    put("totalRequested", requiredPermissions.size)
                    put("rawRecordCount", rawTotalRecords)
                    put("sourcePackages", sourcesArr)
                    put("days", daysArray)
                }

                call.resolve(payload)
            } catch (ex: Exception) {
                call.reject("HEALTH_CONNECT_READ_FAILED: ${ex.message}", ex)
            }
        }
    }
}
