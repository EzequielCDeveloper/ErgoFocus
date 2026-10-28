package com.ergofocus.wearable

import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.*
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.tasks.await
import java.nio.charset.StandardCharsets

class WearableDataLayerModule : Module() {
  private var dataClient: DataClient? = null
  private var messageClient: MessageClient? = null
  private var nodeClient: NodeClient? = null

  private val dataListener = DataClient.OnDataChangedListener { dataEvents ->
    for (event in dataEvents) {
      if (event.type == DataEvent.TYPE_CHANGED) {
        val item = event.dataItem
        val dataMap = DataMapItem.fromDataItem(item).dataMap
        val payload = dataMap.getString("data") ?: ""
        sendEvent("onWearDataChanged", mapOf(
          "path" to (item.uri.path ?: ""),
          "data" to payload
        ))
      }
    }
  }

  private val messageListener = MessageClient.OnMessageReceivedListener { messageEvent ->
    val payload = String(messageEvent.data, StandardCharsets.UTF_8)
    sendEvent("onWearMessageReceived", mapOf(
      "path" to messageEvent.path,
      "data" to payload
    ))
  }

  override fun definition() = ModuleDefinition {
    Name("WearableDataLayerModule")

    Events(
      "onWearDataChanged",
      "onWearMessageReceived",
      "onWearNodeConnected",
      "onWearNodeDisconnected"
    )

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      dataClient = Wearable.getDataClient(context)
      messageClient = Wearable.getMessageClient(context)
      nodeClient = Wearable.getNodeClient(context)

      dataClient?.addListener(dataListener)
      messageClient?.addListener(messageListener)
    }

    OnDestroy {
      dataClient?.removeListener(dataListener)
      messageClient?.removeListener(messageListener)
    }

    AsyncFunction("sendDataItem") { path: String, dataString: String ->
      val context = requireNotNull(appContext.reactContext)
      val client = dataClient ?: Wearable.getDataClient(context)

      val putDataReq = PutDataMapRequest.create(path).apply {
        dataMap.putString("data", dataString)
        dataMap.putLong("timestamp", System.currentTimeMillis())
      }.asPutDataRequest().setUrgent()

      client.putDataItem(putDataReq).await()
      true
    }

    AsyncFunction("sendMessage") { path: String, dataString: String ->
      val context = requireNotNull(appContext.reactContext)
      val msgClient = messageClient ?: Wearable.getMessageClient(context)
      val ndClient = nodeClient ?: Wearable.getNodeClient(context)

      val nodes = ndClient.connectedNodes.await()
      if (nodes.isEmpty()) {
        return@AsyncFunction false
      }

      val bytes = dataString.toByteArray(StandardCharsets.UTF_8)
      for (node in nodes) {
        msgClient.sendMessage(node.id, path, bytes).await()
      }
      true
    }

    AsyncFunction("getConnectedNodes") {
      val context = requireNotNull(appContext.reactContext)
      val ndClient = nodeClient ?: Wearable.getNodeClient(context)
      val nodes = ndClient.connectedNodes.await()
      nodes.map { mapOf("id" to it.id, "displayName" to it.displayName) }
    }
  }
}
