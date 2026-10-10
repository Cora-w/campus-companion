# 校园店铺目录

数据来自用户提供的四川航天职业技术学院校园商铺清单，尚未独立核实。天河、天舟、学府食堂以及学生文体综合楼共4个场所写入 app.places；16条具名店铺或未命名档口分组写入 app.stores，通过 place_id 关联。

名称采用用户提供的“天河食堂”，不自动等同于历史资料中的“天和美食城”。学府食堂的别名、运营方及各场所楼层说明保存在场所 description 中。未提供的营业时间、坐标、联系方式、价格和库存不编造；没有创建商品或商户账号。status=open 用于现有目录可见性，不代表已核实当前营业状态，source_note 明确说明此限制。

## 导入与查看

```powershell
npm.cmd run db:init
npm.cmd run db:seed:stores
```

种子使用稳定 slug / seed_key，在一个事务中执行，只新增不存在的条目，重复执行不会覆盖人工更新。修改 JSON 后不会自动覆盖数据库已有条目；需另行审核更新。

```sql
SELECT p.name AS venue, s.name, s.category, s.floor, s.room_number,
       s.description, s.location, s.cover_url, s.image_credit, s.source_note
FROM app.public_stores s
JOIN app.public_places p ON p.id = s.place_id
ORDER BY p.name, s.floor NULLS LAST, s.name;
```

## 图片

图片以可访问的 HTTPS 地址存储在 cover_url，未将二进制写入数据库。image_credit 同时保留原作者、原始页面、许可链接、is_illustration=true 和中文图片说明。食物、便利店、冰淇淋3种示意图会复用，不是学校现场或品牌商铺实拍；外部链接需要联网，正式部署可另行迁移到项目图片存储。

- 餐饮：[Caramel / Unsplash](https://unsplash.com/photos/a-person-holding-a-spoon-full-of-noodles-yzMuewwRMcY)
- 商超：[Ziph / Unsplash](https://unsplash.com/photos/a-store-shelf-filled-with-lots-of-coffee-cups-HU-uOAO-FUY)
- 冰淇淋：[Haberdoedas / Unsplash](https://unsplash.com/photos/people-ordering-at-a-food-stand-5FFt0ttBft0)

## 对接范围

此次只修改数据库。app.public_stores 已补充图片、所属场所、类别、楼层、房号和来源字段，仍只返回公开店铺，不包含 owner_id。app_backend 和 app_agent 沿用现有公开视图读权限，未新增写权限。前端当前使用静态示例数据，需要后续后端查询这些字段并由前端接入 API 后才会显示这些店铺。
