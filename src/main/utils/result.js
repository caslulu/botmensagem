function extractMessage(error, fallback = 'Erro inesperado') {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function createSuccess(payload = {}, successValue = true) {
  return { success: Boolean(successValue), ...payload };
}

function createError(error, extra = {}) {
  return { success: false, error: extractMessage(error), ...extra };
}

module.exports = {
  createSuccess,
  createError
};
