import type { UiNoticeError } from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/error-message";

export class UiError extends Error {
  public readonly notice: UiNoticeError;

  public constructor(notice: UiNoticeError) {
    super(notice.message);
    this.name = "UiError";
    this.notice = notice;
  }
}

export function uiError(notice: UiNoticeError): UiError {
  return new UiError(notice);
}

export function normalizeUiError(error: unknown, fallbackCode = "INTERNAL_ERROR"): UiNoticeError {
  if (error instanceof UiError) {
    return error.notice;
  }

  return {
    code: fallbackCode,
    title: "Ошибка",
    message: "Операция не выполнена",
    details: getErrorMessage(error).slice(0, 400)
  };
}
