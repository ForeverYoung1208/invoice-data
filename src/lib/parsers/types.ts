/* eslint-disable prettier/prettier */
export interface IJobRow {
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

export interface IClientRow {
  'ID клієнта': string;
  'Прізвище та ініціали': string;
  'Телефон': string;
  'Email': string;
  'Адреса': string;
  'Тип': string;
}

export interface IPartRow {
  'Артикул': string;
  'Назва': string;
  'Категорія': string;
  'Ціна закупівлі (₴)': string;
  'Ціна продажу (₴)': string;
  'Наявність': string;
}

export interface IDevicePartRow {
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
