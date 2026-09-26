import { addDays, format, parse } from 'date-fns'

export const BUSINESS_DATE_FORMAT = 'yyyy-MM-dd'

export const todayBusiness = () => format(new Date(), BUSINESS_DATE_FORMAT)

export const nextBusinessDate = (dateStr) => {
  const d = parse(dateStr, BUSINESS_DATE_FORMAT, new Date())
  return format(addDays(d, 1), BUSINESS_DATE_FORMAT)
}
