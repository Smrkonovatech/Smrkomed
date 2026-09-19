import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:smrkomed_doctor_app/core/network/connectivity_monitor.dart';

class ConnectivityPlusMonitor implements ConnectivityMonitor {
  ConnectivityPlusMonitor({Connectivity? connectivity})
    : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  @override
  Future<NetworkStatus> current() async {
    final results = await _connectivity.checkConnectivity();
    return _map(results);
  }

  @override
  Stream<NetworkStatus> get changes {
    return _connectivity.onConnectivityChanged.map(_map);
  }

  NetworkStatus _map(List<ConnectivityResult> results) {
    final offline =
        results.isEmpty ||
        results.every((item) => item == ConnectivityResult.none);
    return offline ? NetworkStatus.offline : NetworkStatus.online;
  }
}
