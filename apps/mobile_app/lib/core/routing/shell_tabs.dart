import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';

abstract final class ShellTabs {
  static const home = 0;
  static const schedule = 1;
  static const patients = 2;
  static const inbox = 3;
  static const more = 4;
}

/// Use shell `goBranch` so Overview "View all" does not crash by replacing
/// the [StatefulShellRoute] with a bare `/patients` `go()`.
void openShellTab(BuildContext context, int index) {
  final shell = StatefulNavigationShell.maybeOf(context);
  if (shell != null) {
    shell.goBranch(index);
    return;
  }
  const paths = [
    AppRoutes.home,
    AppRoutes.schedule,
    AppRoutes.patients,
    AppRoutes.inbox,
    AppRoutes.more,
  ];
  context.go(paths[index]);
}
