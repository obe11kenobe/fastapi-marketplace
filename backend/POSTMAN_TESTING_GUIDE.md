# Руководство по тестированию API через Postman

## 1. Подготовка

1. Перейди в папку `backend`.
2. Активируй виртуальное окружение.
3. Запусти сервер:

```bash
python run.py
```

После запуска API будет доступно по адресу:

```text
http://127.0.0.1:8000
```

Swagger доступен здесь:

```text
http://127.0.0.1:8000/api/docs
```

## 2. Настройка Postman

Создай Environment и добавь переменную:

```text
base_url = http://127.0.0.1:8000
```

Тогда запросы можно отправлять на:

```text
{{base_url}}/...
```

## 3. Быстрая проверка запуска

### Проверка корня

- Method: `GET`
- URL: `{{base_url}}/`

Ожидаемый ответ:

```json
{
  "message": "Welcome to fastapi shop API",
  "docs": "api/docs"
}
```

### Проверка healthcheck

- Method: `GET`
- URL: `{{base_url}}/health`

Ожидаемый ответ:

```json
{
  "status": "healthy"
}
```

## 4. Тестирование категорий

### Получить все категории

- Method: `GET`
- URL: `{{base_url}}/api/category`

Если база пустая, ответ будет таким:

```json
[]
```

### Получить категорию по id

- Method: `GET`
- URL: `{{base_url}}/api/category/1`

Успешный ответ:

```json
{
  "id": 1,
  "name": "Phones",
  "slug": "phones"
}
```

Если категории нет:

```json
{
  "detail": "CATEGORY NOT FOUND"
}
```

## 5. Тестирование товаров

### Получить все товары

- Method: `GET`
- URL: `{{base_url}}/api/product`

Если база пустая:

```json
{
  "products": [],
  "total": 0
}
```

### Получить товар по id

- Method: `GET`
- URL: `{{base_url}}/api/product/1`

Успешный ответ:

```json
{
  "id": 1,
  "name": "iPhone 15",
  "description": "Smartphone",
  "price": 999.99,
  "category_id": 1,
  "image_url": "https://example.com/image.jpg",
  "created_at": "2026-03-25T12:00:00",
  "category": {
    "name": "Phones",
    "slug": "phones"
  }
}
```

Если товара нет:

```json
{
  "detail": "Product with id 1 not found"
}
```

Важно:
в URL нужно подставлять реальный id. Нельзя отправлять строку вида `/api/product/{product_id}`.

### Получить товары по категории

- Method: `GET`
- URL: `{{base_url}}/api/product/category/1`

Успешный ответ:

```json
{
  "products": [
    {
      "id": 1,
      "name": "iPhone 15",
      "description": "Smartphone",
      "price": 999.99,
      "category_id": 1,
      "image_url": "https://example.com/image.jpg",
      "created_at": "2026-03-25T12:00:00",
      "category": {
        "name": "Phones",
        "slug": "phones"
      }
    }
  ],
  "total": 1
}
```

## 6. Тестирование корзины

Важно:
корзина в текущей реализации не хранится на сервере. Во всех запросах состояние корзины передается прямо в теле запроса как словарь вида:

```json
{
  "1": 2,
  "5": 1
}
```

Это означает:

- товар `1` в количестве `2`
- товар `5` в количестве `1`

### Добавить товар в корзину

- Method: `POST`
- URL: `{{base_url}}/api/cart/add`
- Body -> `raw` -> `JSON`

```json
{
  "product_id": 1,
  "quantity": 2,
  "cart": {}
}
```

Ожидаемая логика:

```json
{
  "cart": {
    "1": 2
  }
}
```

### Получить детали корзины

- Method: `POST`
- URL: `{{base_url}}/api/cart`
- Body -> `raw` -> `JSON`

```json
{
  "1": 2,
  "5": 1
}
```

Ожидаемая логика ответа:

```json
{
  "items": [
    {
      "product_id": 1,
      "name": "iPhone 15",
      "price": 999.99,
      "quantity": 2,
      "subtotal": 1999.98,
      "image_url": "https://example.com/image.jpg"
    }
  ],
  "total": 1999.98,
  "items_count": 2
}
```

### Обновить количество товара

- Method: `PUT`
- URL: `{{base_url}}/api/cart/update`
- Body -> `raw` -> `JSON`

```json
{
  "product_id": 1,
  "quantity": 3,
  "cart": {
    "1": 2
  }
}
```

Ожидаемый ответ:

```json
{
  "cart": {
    "1": 3
  }
}
```

### Удалить товар из корзины

- Method: `DELETE`
- URL: `{{base_url}}/api/cart/remove/1`
- Body -> `raw` -> `JSON`

```json
{
  "cart": {
    "1": 3,
    "5": 1
  }
}
```

Ожидаемый ответ:

```json
{
  "cart": {
    "5": 1
  }
}
```

## 7. Известные ограничения текущего API

На текущий момент в приложении есть только такие маршруты:

- `GET /`
- `GET /health`
- `GET /api/category`
- `GET /api/category/{category_id}`
- `GET /api/product`
- `GET /api/product/{product_id}`
- `GET /api/product/category/{category_id}`
- `POST /api/cart/add`
- `POST /api/cart`
- `PUT /api/cart/update`
- `DELETE /api/cart/remove/{product_id}`

Через API сейчас нельзя создавать категории и товары, потому что маршрутов `POST /api/category` и `POST /api/product` нет.

Также у корзины сейчас есть баги в backend:

- `POST /api/cart/add` может падать
- `POST /api/cart` может падать

Если хочешь полноценно тестировать корзину в Postman, сначала нужно починить `CartService`.

## 8. Рекомендуемый порядок тестирования

1. Проверить `GET /` и `GET /health`.
2. Проверить `GET /api/category`.
3. Проверить `GET /api/product`.
4. Проверить `GET /api/product/{id}` с реальным числом.
5. Проверить `GET /api/product/category/{category_id}`.
6. После исправления корзины проверить `POST /api/cart/add`, `POST /api/cart`, `PUT /api/cart/update`, `DELETE /api/cart/remove/{product_id}`.

## 9. Что удобно добавить в Postman

Во вкладке `Tests` можно добавить простой тест статуса:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

Для `GET /health` можно добавить проверку тела:

```javascript
pm.test("Health is healthy", function () {
    const data = pm.response.json();
    pm.expect(data.status).to.eql("healthy");
});
```
