const pad = (value) => String(value).padStart(2, '0');
const INDIA_TZ = 'Asia/Kolkata';

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value).trim();
  if (!text) return null;

  const normalized = text.replace('T', ' ');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::\d{2})?)?$/);
  if (match) {
    const [, y, m, d, hh = '00', mm = '00'] = match;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
    if (!Number.isNaN(localDate.getTime())) return localDate;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const existingFormat = text.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (existingFormat) {
    const [, d, m, y, hh = '00', mm = '00'] = existingFormat;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
    if (!Number.isNaN(localDate.getTime())) return localDate;
  }

  return null;
};

export const formatDateTime = (value) => {
  const date = parseDateValue(value);
  if (!date) return value || '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${pick('day')}-${pick('month')}-${pick('year')} ${pick('hour')}:${pick('minute')}`;
};

export const toInputDateTime = (value) => {
  const date = parseDateValue(value);
  if (!date) return '';
  const formatted = formatDateTime(date);
  const match = formatted.match(/^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})$/);
  if (!match) return '';
  const [, dd, mm, yyyy, hh, min] = match;
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export const fromInputDateTime = (value) => {
  const text = String(value || '').trim();
  const inputMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (inputMatch) {
    const [, yyyy, mm, dd, hh, min] = inputMatch;
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  }

  const date = parseDateValue(text);
  return formatDateTime(date || new Date());
};

export const nowInputDateTime = () => toInputDateTime(new Date());
