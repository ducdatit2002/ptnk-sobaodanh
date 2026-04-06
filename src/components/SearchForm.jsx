import { useEffect, useState } from 'react';

const EMPTY_FORM = {
  fullName: '',
  citizenId: '',
  captchaAnswer: '',
};

const REQUIRED_MESSAGES = {
  fullName: 'Vui long nhap ho ten.',
  captchaAnswer: 'Vui long nhap ket qua xac thuc.',
};

const INITIAL_CAPTCHA_CHALLENGE = {
  prompt: '7 + 7',
  answer: '14',
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function createCaptchaChallenge() {
  const left = Math.floor(Math.random() * 8) + 2;
  const right = Math.floor(Math.random() * 8) + 1;
  const shouldSubtract = Math.random() > 0.5;

  if (shouldSubtract) {
    const first = Math.max(left, right);
    const second = Math.min(left, right);

    return {
      prompt: `${first} - ${second}`,
      answer: String(first - second),
    };
  }

  return {
    prompt: `${left} + ${right}`,
    answer: String(left + right),
  };
}

function SearchForm({
  onSubmit,
  isDarkMode,
  isLocked = false,
  loading = false,
  submitLabel = 'Tra cứu',
}) {
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [captcha, setCaptcha] = useState(INITIAL_CAPTCHA_CHALLENGE);
  const isBusy = isLocked || loading;
  const disabledControlClass = isBusy ? 'cursor-not-allowed opacity-70' : '';

  useEffect(() => {
    setCaptcha(createCaptchaChallenge());
  }, []);

  const refreshCaptcha = () => {
    if (isBusy) {
      return;
    }

    setCaptcha(createCaptchaChallenge());
    setFormValues((currentValues) => ({
      ...currentValues,
      captchaAnswer: '',
    }));
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors.captchaAnswer;
      return nextErrors;
    });
  };

  const validate = (values) => {
    const nextErrors = {};

    if (!values.fullName) {
      nextErrors.fullName = REQUIRED_MESSAGES.fullName;
    }

    if (!values.captchaAnswer) {
      nextErrors.captchaAnswer = REQUIRED_MESSAGES.captchaAnswer;
    } else if (values.captchaAnswer !== captcha.answer) {
      nextErrors.captchaAnswer = 'Ket qua xac thuc chua dung.';
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    const normalizedValue = normalizeText(value);

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: normalizedValue,
    }));

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (!normalizedValue && REQUIRED_MESSAGES[name]) {
        nextErrors[name] = REQUIRED_MESSAGES[name];
      } else if (name === 'captchaAnswer' && normalizedValue !== captcha.answer) {
        nextErrors[name] = 'Ket qua xac thuc chua dung.';
      } else {
        delete nextErrors[name];
      }

      return nextErrors;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    const normalizedValues = {
      fullName: normalizeText(formValues.fullName),
      citizenId: normalizeText(formValues.citizenId),
      captchaAnswer: normalizeText(formValues.captchaAnswer),
    };

    const nextErrors = validate(normalizedValues);

    setFormValues(normalizedValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await Promise.resolve(onSubmit(normalizedValues));
    refreshCaptcha();
  };

  return (
    <div className="relative">
      <form
        className={`space-y-5 ${isLocked ? 'select-none blur-[1px]' : ''}`}
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="space-y-1.5">
          <label
            className={`text-sm font-medium tracking-wide ${
              isDarkMode ? 'text-slate-200' : 'text-slate-700'
            }`}
            htmlFor="fullName"
          >
            Họ tên
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formValues.fullName}
            onBlur={handleBlur}
            onChange={handleChange}
            placeholder="Nhập họ tên học sinh"
            autoComplete="name"
            disabled={isBusy}
            className={`w-full rounded-2xl border px-4 py-3 text-base outline-none transition ${disabledControlClass} ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900/75 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:bg-slate-900'
                : 'border-sky-100 bg-sky-50/80 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-sky-50'
            }`}
          />
          {errors.fullName ? (
            <p className="text-sm text-rose-500">{errors.fullName}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            className={`text-sm font-medium tracking-wide ${
              isDarkMode ? 'text-slate-200' : 'text-slate-700'
            }`}
            htmlFor="citizenId"
          >
            Số điện thoại
          </label>
          <input
            id="citizenId"
            name="citizenId"
            type="text"
            inputMode="numeric"
            value={formValues.citizenId}
            onBlur={handleBlur}
            onChange={handleChange}
            placeholder="Nhập số điện thoại (không bắt buộc)"
            autoComplete="off"
            disabled={isBusy}
            className={`w-full rounded-2xl border px-4 py-3 text-base outline-none transition ${disabledControlClass} ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900/75 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:bg-slate-900'
                : 'border-sky-100 bg-sky-50/80 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-sky-50'
            }`}
          />
        </div>

        <div
          className={`rounded-3xl border p-4 ${
            isDarkMode
              ? 'border-slate-800 bg-slate-900/60'
              : 'border-sky-100 bg-[linear-gradient(135deg,_#f7fdff,_#e8f6ff)]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className={`text-sm font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Xác thực
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tracking-wide ${
                  isDarkMode ? 'text-cyan-200' : 'text-sky-800'
                }`}
              >
                {captcha.prompt} = ?
              </p>
            </div>

            <button
              type="button"
              onClick={refreshCaptcha}
              disabled={isBusy}
              className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${disabledControlClass} ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-cyan-400/30'
                  : 'border-sky-200 bg-white/80 text-sky-700 hover:bg-sky-50'
              }`}
            >
              Đổi câu hỏi
            </button>
          </div>

          <div className="mt-4 space-y-1.5">
            <input
              id="captchaAnswer"
              name="captchaAnswer"
              type="text"
              inputMode="numeric"
              value={formValues.captchaAnswer}
              onBlur={handleBlur}
              onChange={handleChange}
              placeholder="Nhập kết quả"
              autoComplete="off"
              disabled={isBusy}
              className={`w-full rounded-2xl border px-4 py-3 text-base outline-none transition ${disabledControlClass} ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-950/75 text-white placeholder:text-slate-500 focus:border-cyan-400'
                  : 'border-sky-100 bg-white/90 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400'
              }`}
            />
            {errors.captchaAnswer ? (
              <p className="text-sm text-rose-500">{errors.captchaAnswer}</p>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className={`inline-flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-white transition ${disabledControlClass} ${
            isDarkMode
              ? 'bg-[linear-gradient(135deg,_#0891b2,_#2563eb)] shadow-[0_18px_40px_rgba(37,99,235,0.28)]'
              : 'bg-[linear-gradient(135deg,_#22d3ee,_#2492ff)] shadow-[0_18px_40px_rgba(34,211,238,0.28)]'
          }`}
        >
          {loading ? 'Đang tra cứu...' : submitLabel}
        </button>
      </form>

      {isLocked ? (
        <div className="absolute inset-0 z-10 cursor-not-allowed rounded-[1.5rem]">
          <div className="flex h-full items-center justify-center px-4">
            <div
              className={`inline-flex max-w-sm items-center gap-3 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur ${
                isDarkMode
                  ? 'border-rose-400/30 bg-slate-950/82 text-rose-100'
                  : 'border-rose-200 bg-white/92 text-rose-700'
              }`}
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8.25"
                  className={isDarkMode ? 'stroke-rose-200' : 'stroke-rose-600'}
                  strokeWidth="1.8"
                />
                <path
                  d="M6.7 17.3 17.3 6.7"
                  className={isDarkMode ? 'stroke-rose-200' : 'stroke-rose-600'}
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </svg>
              <span>Tra cứu sẽ mở lúc 14h ngày 7/5/2026</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SearchForm;
