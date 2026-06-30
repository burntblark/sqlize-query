# sqlize-query

Turn a `where` URL query parameter into a ready-to-use Sequelize `where` clause — no manual parsing, no boilerplate.

Clients send a JSON-encoded filter in the query string. The server passes that string directly to `retrieveWhere` and spreads the result into `Model.findAll`. Every Sequelize operator (`$like`, `$gt`, `$or`, `$and`, …) is supported out of the box.

---

## Installation

```bash
npm install sqlize-query
```

Sequelize v6 is a peer dependency and must be installed in your project:

```bash
npm install sequelize
```

---

## Quick start

```js
const { retrieveWhere } = require('sqlize-query');

// Express route
app.get('/users', async (req, res) => {
  const filter = retrieveWhere(req.query.where);

  const users = await User.findAll({
    ...filter,          // spreads as { where: { ... } }
    limit: 20,
  });

  res.json(users);
});
```

Client request:
```
GET /users?where={"name":{"$like":"%john%"},"active":true}
```

---

## API

### `retrieveWhere(whereStr, options?)`

| Parameter | Type | Description |
|---|---|---|
| `whereStr` | `string \| null \| undefined` | The raw JSON string from `req.query.where` |
| `options.blacklist` | `string[]` | Field names that may never be queried (optional) |

**Returns** `{ where: WhereOptions }` — ready to spread into `findAll`, `findOne`, `count`, etc.  
**Returns** `undefined` when `whereStr` is empty, `null`, or `undefined` — safe to spread (spreads nothing).  
**Throws** `Error('invalid JSON')` on malformed JSON.  
**Throws** `Error('where must be a JSON object')` when the parsed value is not a plain object.  
**Throws** `Error('Unknown Sequelize operator: $xyz')` on unrecognised `$`-prefixed keys.

---

## Operators

All standard Sequelize operators are supported. Use the `$camelCase` string form that matches the `Op` key name.

### Comparison

| JSON key | Sequelize Op | Description |
|---|---|---|
| `$eq` | `Op.eq` | Equal |
| `$ne` | `Op.ne` | Not equal |
| `$gt` | `Op.gt` | Greater than |
| `$gte` | `Op.gte` | Greater than or equal |
| `$lt` | `Op.lt` | Less than |
| `$lte` | `Op.lte` | Less than or equal |
| `$is` | `Op.is` | Strict equality (for `null` checks) |
| `$not` | `Op.not` | Negation |

```
GET /users?where={"age":{"$gte":18,"$lte":65}}
```
```js
// Produces:
{ where: { age: { [Op.gte]: 18, [Op.lte]: 65 } } }
```

---

### String matching

| JSON key | Sequelize Op | Description |
|---|---|---|
| `$like` | `Op.like` | Case-sensitive LIKE |
| `$notLike` | `Op.notLike` | Case-sensitive NOT LIKE |
| `$iLike` | `Op.iLike` | Case-insensitive LIKE (PostgreSQL) |
| `$notILike` | `Op.notILike` | Case-insensitive NOT LIKE (PostgreSQL) |
| `$startsWith` | `Op.startsWith` | Starts with |
| `$endsWith` | `Op.endsWith` | Ends with |
| `$substring` | `Op.substring` | Contains substring |
| `$regexp` | `Op.regexp` | Matches regex (MySQL / PostgreSQL) |
| `$notRegexp` | `Op.notRegexp` | Does not match regex |
| `$iRegexp` | `Op.iRegexp` | Case-insensitive regex (PostgreSQL) |
| `$notIRegexp` | `Op.notIRegexp` | Case-insensitive NOT regex (PostgreSQL) |

```
GET /products?where={"name":{"$iLike":"%phone%"}}
```
```js
{ where: { name: { [Op.iLike]: '%phone%' } } }
```

---

### Array / range

| JSON key | Sequelize Op | Description |
|---|---|---|
| `$in` | `Op.in` | Value in list |
| `$notIn` | `Op.notIn` | Value not in list |
| `$between` | `Op.between` | Value between two bounds (inclusive) |
| `$notBetween` | `Op.notBetween` | Value outside two bounds |

```
GET /orders?where={"status":{"$in":["pending","processing"]},"total":{"$between":[100,500]}}
```
```js
{
  where: {
    status: { [Op.in]: ['pending', 'processing'] },
    total:  { [Op.between]: [100, 500] },
  }
}
```

---

### Logical

| JSON key | Sequelize Op | Description |
|---|---|---|
| `$and` | `Op.and` | All conditions must match |
| `$or` | `Op.or` | Any condition must match |
| `$not` | `Op.not` | Negates a condition or group |

```
GET /users?where={"$or":[{"role":"admin"},{"role":"moderator"}]}
```
```js
{ where: { [Op.or]: [{ role: 'admin' }, { role: 'moderator' }] } }
```

---

### Other

| JSON key | Sequelize Op | Description |
|---|---|---|
| `$any` | `Op.any` | Any value in array (PostgreSQL) |
| `$all` | `Op.all` | All values in array (PostgreSQL) |
| `$col` | `Op.col` | Compare against another column |
| `$contains` | `Op.contains` | JSON / array contains (PostgreSQL) |
| `$contained` | `Op.contained` | JSON / array is contained by (PostgreSQL) |
| `$overlap` | `Op.overlap` | Arrays have common elements (PostgreSQL) |
| `$adjacent` | `Op.adjacent` | Ranges are adjacent (PostgreSQL) |
| `$strictLeft` | `Op.strictLeft` | Range is strictly left of (PostgreSQL) |
| `$strictRight` | `Op.strictRight` | Range is strictly right of (PostgreSQL) |

---

## Examples

### Simple equality

```
GET /users?where={"email":"alice@example.com"}
```
```js
await User.findAll({
  ...retrieveWhere(req.query.where),
});
// SELECT * FROM users WHERE email = 'alice@example.com'
```

---

### Multiple fields (implicit AND)

```
GET /users?where={"role":"admin","active":true}
```
```js
{ where: { role: 'admin', active: true } }
// SELECT * FROM users WHERE role = 'admin' AND active = true
```

---

### Null checks

```
GET /users?where={"deletedAt":{"$is":null}}
```
```js
{ where: { deletedAt: { [Op.is]: null } } }
// SELECT * FROM users WHERE deletedAt IS NULL
```

Direct `null` equality also works:

```
GET /users?where={"deletedAt":null}
```
```js
{ where: { deletedAt: null } }
```

---

### Pattern matching

```
GET /products?where={"sku":{"$startsWith":"ELEC-"},"description":{"$like":"%wireless%"}}
```
```js
{
  where: {
    sku:         { [Op.startsWith]: 'ELEC-' },
    description: { [Op.like]: '%wireless%' },
  }
}
```

---

### Range filter

```
GET /products?where={"price":{"$gte":10,"$lte":100}}
```
```js
{ where: { price: { [Op.gte]: 10, [Op.lte]: 100 } } }
// SELECT * FROM products WHERE price >= 10 AND price <= 100
```

---

### IN / NOT IN

```
GET /orders?where={"status":{"$in":["shipped","delivered"]}}
```
```js
{ where: { status: { [Op.in]: ['shipped', 'delivered'] } } }
```

```
GET /users?where={"role":{"$notIn":["banned","deleted"]}}
```
```js
{ where: { role: { [Op.notIn]: ['banned', 'deleted'] } } }
```

---

### OR condition

```
GET /users?where={"$or":[{"firstName":"John"},{"lastName":"John"}]}
```
```js
{ where: { [Op.or]: [{ firstName: 'John' }, { lastName: 'John' }] } }
```

---

### AND condition

```
GET /users?where={"$and":[{"age":{"$gte":18}},{"country":"NG"}]}
```
```js
{ where: { [Op.and]: [{ age: { [Op.gte]: 18 } }, { country: 'NG' }] } }
```

---

### Nested logical conditions

```
GET /users?where={"$or":[{"$and":[{"age":{"$gte":18}},{"active":true}]},{"role":"admin"}]}
```
```js
{
  where: {
    [Op.or]: [
      {
        [Op.and]: [
          { age:    { [Op.gte]: 18 } },
          { active: true },
        ]
      },
      { role: 'admin' },
    ]
  }
}
// Users who are (18+ AND active) OR are admins
```

---

### NOT condition

```
GET /users?where={"$not":{"status":"suspended"}}
```
```js
{ where: { [Op.not]: { status: 'suspended' } } }
```

---

### Column comparison

```
GET /products?where={"discountedPrice":{"$lt":{"$col":"originalPrice"}}}
```
```js
{ where: { discountedPrice: { [Op.lt]: { [Op.col]: 'originalPrice' } } } }
// SELECT * FROM products WHERE discountedPrice < originalPrice
```

---

### No filter (returns undefined)

When `where` is absent from the query string, `retrieveWhere` returns `undefined`. Spreading `undefined` is a no-op, so the call is always safe:

```js
// GET /users  (no ?where param)
const users = await User.findAll({
  ...retrieveWhere(req.query.where),  // spreads nothing
  limit: 20,
  order: [['createdAt', 'DESC']],
});
```

---

### Combining with other Sequelize options

`retrieveWhere` only produces the `where` key. You compose it freely with any other `findAll` options:

```js
const users = await User.findAll({
  ...retrieveWhere(req.query.where),
  include: [{ model: Role }],
  order: [['createdAt', 'DESC']],
  limit: parseInt(req.query.limit) || 20,
  offset: parseInt(req.query.offset) || 0,
});
```

---

## Blacklist — restricting queryable fields

Pass a `blacklist` array to prevent clients from filtering on sensitive or internal fields. Blacklisted fields are silently dropped from the query; operators (`$or`, `$and`, etc.) are never affected.

```js
const filter = retrieveWhere(req.query.where, {
  blacklist: ['password', 'hashedPassword', 'internalScore', 'stripeCustomerId'],
});
```

Even if the client sends:

```
GET /users?where={"email":"x@y.com","password":{"$like":"%secret%"}}
```

The `password` field is stripped and the produced query is only:

```js
{ where: { email: 'x@y.com' } }
```

---

## Error handling

Wrap the call in a try/catch at your route level to return a clean HTTP 400 on bad input:

```js
app.get('/users', async (req, res) => {
  let filter;
  try {
    filter = retrieveWhere(req.query.where, {
      blacklist: ['password'],
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const users = await User.findAll({ ...filter, limit: 20 });
  res.json(users);
});
```

Possible error messages:

| Error | Cause |
|---|---|
| `invalid JSON` | `where` string is not valid JSON |
| `where must be a JSON object` | Parsed value is an array, string, number, or `null` |
| `Unknown Sequelize operator: $xyz` | `$xyz` is not a recognised Sequelize operator |

---

## TypeScript

Types are included. The `options` parameter is fully optional.

```ts
import { retrieveWhere, Options, Result } from 'sqlize-query';

const filter: Result | undefined = retrieveWhere(req.query.where as string, {
  blacklist: ['password'],
});

await User.findAll({ ...filter });
```

---

## License

ISC
