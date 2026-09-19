import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_metrics.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

abstract class HomeRepository {
  Future<HomeDashboard> loadDashboard({
    DateTime? now,
    String? doctorName,
    String? doctorId,
  });
}

class HomeRemoteDataSource {
  HomeRemoteDataSource({
    required ApiClient apiClient,
    required AppLogger logger,
  }) : _apiClient = apiClient,
       _logger = logger;

  final ApiClient _apiClient;
  final AppLogger _logger;

  Future<HomeDashboard> loadDashboard({
    DateTime? now,
    String? doctorName,
    String? doctorId,
  }) async {
    final clock = now ?? DateTime.now();
    List<ClinicCouple>? couples;
    List<ClinicAppointment>? appointments;
    List<ClinicTask>? tasks;
    CareLoopAnalytics? analytics;
    List<CareLoopException>? exceptions;
    String? couplesError;
    String? appointmentsError;
    String? tasksError;
    String? analyticsError;
    String? exceptionsError;

    final results = await Future.wait([
      _getList(ApiPaths.couples, ClinicCouple.fromJson),
      _getList(ApiPaths.appointments, ClinicAppointment.fromJson),
      _getList(ApiPaths.careTasks, ClinicTask.fromJson),
      _getObject(ApiPaths.careLoopAnalytics, CareLoopAnalytics.fromJson),
      _getList(ApiPaths.careLoopExceptions, CareLoopException.fromJson),
    ]);

    final coupleResult = results[0];
    final appointmentResult = results[1];
    final taskResult = results[2];
    final analyticsResult = results[3];
    final exceptionResult = results[4];

    if (coupleResult is _Ok<List<ClinicCouple>>) {
      couples = coupleResult.value.where((c) {
        final id = c.clinicId.trim().toLowerCase();
        if (id == 'cmt0exo9n000vl804rbaabh32' || id == 'blr' || id.contains('bangalore')) {
          return false;
        }
        if (c.isQrCheckin) {
          return false;
        }
        return true;
      }).toList();
    } else if (coupleResult is _Fail) {
      couplesError = coupleResult.message;
    }
    if (appointmentResult is _Ok<List<ClinicAppointment>>) {
      appointments = appointmentResult.value.where((a) {
        final id = a.clinicId.trim().toLowerCase();
        if (id == 'cmt0exo9n000vl804rbaabh32' || id == 'blr' || id.contains('bangalore')) {
          return false;
        }
        return true;
      }).toList();
    } else if (appointmentResult is _Fail) {
      appointmentsError = appointmentResult.message;
    }
    if (taskResult is _Ok<List<ClinicTask>>) {
      tasks = taskResult.value;
    } else if (taskResult is _Fail) {
      tasksError = taskResult.message;
    }
    if (analyticsResult is _Ok<CareLoopAnalytics>) {
      analytics = analyticsResult.value;
    } else if (analyticsResult is _Fail) {
      analyticsError = analyticsResult.message;
    }
    if (exceptionResult is _Ok<List<CareLoopException>>) {
      exceptions = exceptionResult.value;
    } else if (exceptionResult is _Fail) {
      exceptionsError = exceptionResult.message;
    }

    _logger.info(
      'Home dashboard loaded',
      context: {
        'path': 'home',
        'coupleCount': couples?.length,
        'appointmentCount': appointments?.length,
        'taskCount': tasks?.length,
        'hasAnalytics': analytics != null,
        'exceptionCount': exceptions?.length,
      },
    );

    return HomeMetrics.assemble(
      now: clock,
      couples: couples,
      appointments: appointments,
      tasks: tasks,
      analytics: analytics,
      exceptions: exceptions,
      couplesError: couplesError,
      appointmentsError: appointmentsError,
      tasksError: tasksError,
      analyticsError: analyticsError,
      exceptionsError: exceptionsError,
      doctorName: doctorName,
      doctorId: doctorId,
    );
  }

  Future<Object> _getList<T>(
    String path,
    T Function(Map<String, dynamic> json) parse,
  ) async {
    try {
      final rows = await _apiClient.get<List<T>>(
        path,
        parse: (data) => _asMaps(data).map(parse).toList(),
      );
      return _Ok<List<T>>(rows);
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized) rethrow;
      _logger.warn(
        'Home section failed',
        context: {'path': path, 'category': error.kind.name},
      );
      return _Fail(error.message);
    }
  }

  Future<Object> _getObject<T>(
    String path,
    T Function(Map<String, dynamic> json) parse,
  ) async {
    try {
      final value = await _apiClient.get<T>(
        path,
        parse: (data) {
          if (data is! Map) {
            throw AppException.server('Unable to load home metrics.');
          }
          return parse(Map<String, dynamic>.from(data));
        },
      );
      return _Ok<T>(value);
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized) rethrow;
      _logger.warn(
        'Home section failed',
        context: {'path': path, 'category': error.kind.name},
      );
      return _Fail(error.message);
    }
  }
}

class HomeRepositoryImpl implements HomeRepository {
  HomeRepositoryImpl(this._remote);

  final HomeRemoteDataSource _remote;

  @override
  Future<HomeDashboard> loadDashboard({
    DateTime? now,
    String? doctorName,
    String? doctorId,
  }) {
    return _remote.loadDashboard(
      now: now,
      doctorName: doctorName,
      doctorId: doctorId,
    );
  }
}

class _Ok<T> {
  const _Ok(this.value);
  final T value;
}

class _Fail {
  const _Fail(this.message);
  final String message;
}

List<Map<String, dynamic>> _asMaps(dynamic data) {
  if (data is! List) return const [];
  return data
      .whereType<Map>()
      .map((row) => Map<String, dynamic>.from(row))
      .toList();
}
