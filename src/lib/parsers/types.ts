/* eslint-disable prettier/prettier */
export interface JobRow {
  '№ заявки': string;
  'Дата прийому': string;
  'Прізвище клієнта': string;
  'Пристрій': string;
  'Модель': string;
  'Опис несправності': string;
  'Статус': string;
  'Вартість ремонт.': string;
  'Примітки': string;
}

export interface ClientRow {
  'ID клієнта': string;
  'Прізвище та ініціали': string;
  'Телефон': string;
  'Email': string;
  'Адреса': string;
  'Тип': string;
}

export interface PartRow {
  'Артикул': string;
  'Назва': string;
  'Категорія': string;
  'Ціна закупівлі (₴)': string;
  'Ціна продажу (₴)': string;
  'Наявність': string;
}

export interface DevicePartRow {
  'Категорія': string;
  'Бренд': string;
  'Модель': string;
  'Тип пристрою': string;
  'Складність ремонту (1-5)': string;
  'Час ремонту (год)': string;
  'Типові запчастини': string;
  'Чорний список запчастин': string;
  'Примітки': string;
}
