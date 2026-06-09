// Clean DTO interfaces — English keys, consumed by the entire application.
// The CSV headers (Cyrillic) are mapped to these in parsers/mappers.ts.

export interface IJobRow {
  jobNumber: string; // № заявки
  date: string; // Дата прийому
  clientName: string; // Прізвище клієнта
  deviceType: string; // Пристрій
  model: string; // Модель
  faultDescription: string; // Опис несправності
  status: string; // Статус
  repairCost: string; // Вартість ремонт.
  notes: string; // Примітки
}

export interface IClientRow {
  clientId: string; // ID клієнта
  fullName: string; // Прізвище та ініціали
  phone: string; // Телефон
  email: string; // Email
  address: string; // Адреса
  type: string; // Тип
}

export interface IPartRow {
  partId: string; // Артикул
  name: string; // Назва
  category: string; // Категорія
  purchasePrice: string; // Ціна закупівлі (₴)
  salePrice: string; // Ціна продажу (₴)
  inStock: string; // Наявність
}

export interface IDevicePartRow {
  category: string; // Категорія
  brand: string; // Бренд
  model: string; // Модель
  deviceType: string; // Тип пристрою
  repairComplexity: string; // Складність ремонту (1-5)
  repairTimeHours: string; // Час ремонту (год)
  typicalParts: string; // Типові запчастини
  blacklistedParts: string; // Чорний список запчастин
  notes: string; // Примітки
}
