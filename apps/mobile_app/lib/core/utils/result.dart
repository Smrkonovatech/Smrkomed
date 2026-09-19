sealed class Result<T> {
  const Result();

  R when<R>({
    required R Function(T data) ok,
    required R Function(Object error) err,
  }) {
    final self = this;
    if (self is Ok<T>) return ok(self.value);
    if (self is Err<T>) return err(self.error);
    throw StateError('Unknown result');
  }
}

class Ok<T> extends Result<T> {
  const Ok(this.value);
  final T value;
}

class Err<T> extends Result<T> {
  const Err(this.error);
  final Object error;
}
