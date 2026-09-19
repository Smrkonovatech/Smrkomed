enum NetworkStatus { online, offline }

abstract class ConnectivityMonitor {
  Future<NetworkStatus> current();
  Stream<NetworkStatus> get changes;
}

class AlwaysOnlineConnectivity implements ConnectivityMonitor {
  const AlwaysOnlineConnectivity();

  @override
  Future<NetworkStatus> current() async => NetworkStatus.online;

  @override
  Stream<NetworkStatus> get changes => const Stream.empty();
}
