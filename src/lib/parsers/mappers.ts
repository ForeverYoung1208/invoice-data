// Mapper functions: raw CSV row (Cyrillic keys) → typed DTO (English keys).
// These are the ONLY place in the codebase that references Cyrillic column names.

import { IClientRow, IDevicePartRow, IJobRow, IPartRow } from './types';

type RawRow = Record<string, string>;

export function mapJobRow(r: RawRow): IJobRow {
  return {
    jobNumber: r['№ заявки'] ?? '',
    date: r['Дата прийому'] ?? '',
    clientName: r['Прізвище клієнта'] ?? '',
    deviceType: r['Пристрій'] ?? '',
    model: r['Модель'] ?? '',
    faultDescription: r['Опис несправності'] ?? '',
    status: r['Статус'] ?? '',
    repairCost: r['Вартість ремонт.'] ?? '',
    notes: r['Примітки'] ?? '',
  };
}

export function mapClientRow(r: RawRow): IClientRow {
  return {
    clientId: r['ID клієнта'] ?? '',
    fullName: r['Прізвище та ініціали'] ?? '',
    phone: r['Телефон'] ?? '',
    email: r['Email'] ?? '',
    address: r['Адреса'] ?? '',
    type: r['Тип'] ?? '',
  };
}

export function mapPartRow(r: RawRow): IPartRow {
  return {
    partId: r['Артикул'] ?? '',
    name: r['Назва'] ?? '',
    category: r['Категорія'] ?? '',
    purchasePrice: r['Ціна закупівлі (₴)'] ?? '',
    salePrice: r['Ціна продажу (₴)'] ?? '',
    inStock: r['Наявність'] ?? '',
  };
}

export function mapDevicePartRow(r: RawRow): IDevicePartRow {
  return {
    category: r['Категорія'] ?? '',
    brand: r['Бренд'] ?? '',
    model: r['Модель'] ?? '',
    deviceType: r['Тип пристрою'] ?? '',
    repairComplexity: r['Складність ремонту (1-5)'] ?? '',
    repairTimeHours: r['Час ремонту (год)'] ?? '',
    typicalParts: r['Типові запчастини'] ?? '',
    blacklistedParts: r['Чорний список запчастин'] ?? '',
    notes: r['Примітки'] ?? '',
  };
}
