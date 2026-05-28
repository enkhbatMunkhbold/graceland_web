/** US federal holidays with weekend observance rules (OPM). */

export const HOLIDAY_ICON_KEYS = {
  newYearsDay: 'newYearsDay',
  mlkDay: 'mlkDay',
  presidentsDay: 'presidentsDay',
  memorialDay: 'memorialDay',
  juneteenth: 'juneteenth',
  independenceDay: 'independenceDay',
  laborDay: 'laborDay',
  columbusDay: 'columbusDay',
  veteransDay: 'veteransDay',
  thanksgiving: 'thanksgiving',
  christmas: 'christmas',
};

function nthWeekday(year, monthIndex, weekday, n) {
  let count = 0;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    if (date.getDay() === weekday) {
      count += 1;
      if (count === n) return date;
    }
  }
  return null;
}

function lastWeekday(year, monthIndex, weekday) {
  for (let day = new Date(year, monthIndex + 1, 0).getDate(); day >= 1; day -= 1) {
    const date = new Date(year, monthIndex, day);
    if (date.getDay() === weekday) return date;
  }
  return null;
}

function observeFixedHoliday(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day);
  const dow = date.getDay();
  if (dow === 6) return new Date(year, monthIndex, day - 1);
  if (dow === 0) return new Date(year, monthIndex, day + 1);
  return date;
}

export function getFederalHolidaysForYear(year) {
  return [
    { key: HOLIDAY_ICON_KEYS.newYearsDay, date: observeFixedHoliday(year, 0, 1) },
    { key: HOLIDAY_ICON_KEYS.mlkDay, date: nthWeekday(year, 0, 1, 3) },
    { key: HOLIDAY_ICON_KEYS.presidentsDay, date: nthWeekday(year, 1, 1, 3) },
    { key: HOLIDAY_ICON_KEYS.memorialDay, date: lastWeekday(year, 4, 1) },
    { key: HOLIDAY_ICON_KEYS.juneteenth, date: observeFixedHoliday(year, 5, 19) },
    { key: HOLIDAY_ICON_KEYS.independenceDay, date: observeFixedHoliday(year, 6, 4) },
    { key: HOLIDAY_ICON_KEYS.laborDay, date: nthWeekday(year, 8, 1, 1) },
    { key: HOLIDAY_ICON_KEYS.columbusDay, date: nthWeekday(year, 9, 1, 2) },
    { key: HOLIDAY_ICON_KEYS.veteransDay, date: observeFixedHoliday(year, 10, 11) },
    { key: HOLIDAY_ICON_KEYS.thanksgiving, date: nthWeekday(year, 10, 4, 4) },
    { key: HOLIDAY_ICON_KEYS.christmas, date: observeFixedHoliday(year, 11, 25) },
  ].filter(h => h.date);
}

export function getFederalHolidayMapForYears(years) {
  const map = {};
  years.forEach(year => {
    getFederalHolidaysForYear(year).forEach(({ key, date }) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      map[`${y}-${m}-${d}`] = key;
    });
  });
  return map;
}

export const HOLIDAY_TRANSLATION_KEYS = {
  [HOLIDAY_ICON_KEYS.newYearsDay]: 'holidayNewYearsDay',
  [HOLIDAY_ICON_KEYS.mlkDay]: 'holidayMlkDay',
  [HOLIDAY_ICON_KEYS.presidentsDay]: 'holidayPresidentsDay',
  [HOLIDAY_ICON_KEYS.memorialDay]: 'holidayMemorialDay',
  [HOLIDAY_ICON_KEYS.juneteenth]: 'holidayJuneteenth',
  [HOLIDAY_ICON_KEYS.independenceDay]: 'holidayIndependenceDay',
  [HOLIDAY_ICON_KEYS.laborDay]: 'holidayLaborDay',
  [HOLIDAY_ICON_KEYS.columbusDay]: 'holidayColumbusDay',
  [HOLIDAY_ICON_KEYS.veteransDay]: 'holidayVeteransDay',
  [HOLIDAY_ICON_KEYS.thanksgiving]: 'holidayThanksgiving',
  [HOLIDAY_ICON_KEYS.christmas]: 'holidayChristmas',
};
