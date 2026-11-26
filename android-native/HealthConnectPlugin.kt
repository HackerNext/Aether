package com.aetheros.biometrics.plugins

import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
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
import java.time.temporal.ChronoUnit

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
                call.resolve(res)
            }
        }
    }

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        val result = JSObject()
        result.put("available", status == HealthConnectClient.SDK_AVAILABLE)
        result.put("sdkStatus", status)
        call.resolve(result)
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("HEALTH_CONNECT_UNAVAILABLE")
            return
        }
        pendingPermCall = call
        activity.runOnUiThread {
            permissionLauncher.launch(requiredPermissions)
        }
    }

    @PluginMethod
    fun readBiometricsBundle(call: PluginCall) {
        val daysBack = call.getInt("daysBack", 30) ?: 30
        val client = HealthConnectClient.getOrCreate(context)
        val endTime = Instant.now()
        val startTime = endTime.minus(daysBack.toLong(), ChronoUnit.DAYS)
        val range = TimeRangeFilter.between(startTime, endTime)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                if (granted.isEmpty()) {
                    call.reject("HEALTH_CONNECT_PERMISSIONS_MISSING")
                    return@launch
                }

                val stepsRes = if (granted.contains(HealthPermission.getReadPermission(StepsRecord::class)))
                    client.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records else emptyList()
                val rhrRes = if (granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class)))
                    client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records else emptyList()
                val hrRes = if (granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class)))
                    client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range)).records else emptyList()
                val sleepRes = if (granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)))
                    client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range)).records else emptyList()
                val spo2Res = if (granted.contains(HealthPermission.getReadPermission(OxygenSaturationRecord::class)))
                    client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, range)).records else emptyList()
                val calRes = if (granted.contains(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)))
                    client.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, range)).records else emptyList()
                val exerciseRes = if (granted.contains(HealthPermission.getReadPermission(ExerciseSessionRecord::class)))
                    client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range)).records else emptyList()
                val hrvRes = if (granted.contains(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)))
                    client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range)).records else emptyList()

                val payload = JSObject()
                payload.put("syncedAt", endTime.toString())
                payload.put("stepsCount", stepsRes.sumOf { it.count })

                val rhrArr = JSArray()
                rhrRes.forEach {
                    rhrArr.put(JSObject().apply {
                        put("time", it.time.toString())
                        put("bpm", it.beatsPerMinute)
                        put("source", it.metadata.dataOrigin.packageName)
                    })
                }
                payload.put("restingHrRecords", rhrArr)

                val hrvArr = JSArray()
                hrvRes.forEach {
                    hrvArr.put(JSObject().apply {
                        put("time", it.time.toString())
                        put("rmssdMs", it.heartRateVariabilityMillis)
                    })
                }
                payload.put("hrvRecords", hrvArr)

                val spo2Arr = JSArray()
                spo2Res.forEach {
                    spo2Arr.put(JSObject().apply {
                        put("time", it.time.toString())
                        put("percentage", it.percentage.value)
                    })
                }
                payload.put("spo2Records", spo2Arr)

                payload.put("activeCaloriesKcal", calRes.sumOf { it.energy.inKilocalories })
                payload.put("sleepSessionsCount", sleepRes.size)
                payload.put("exerciseSessionsCount", exerciseRes.size)
                payload.put("heartRateSamplesCount", hrRes.sumOf { it.samples.size })

                call.resolve(payload)
            } catch (ex: Exception) {
                call.reject("HEALTH_CONNECT_READ_FAILED: ${ex.message}", ex)
            }
        }
    }
}
