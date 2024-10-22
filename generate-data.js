const faker = require("faker");
const fs = require("fs");

faker.locale = "vi";

const getCategories = (n) => {
  if (n <= 0) return [];
  let result = [];
  Array.from(new Array(n)).forEach(() => {
    const category = {
      id: faker.datatype.uuid(),
      name: faker.commerce.department(),
      createAt: Date.now(),
      image: faker.image.image(),
    };
    result.push(category);
  });
  return result;
};
const getProductList = (categoryList, numberOfProduct) => {
  if (numberOfProduct <= 0) return [];
  let result = [];
  for (let category of categoryList) {
    Array.from(new Array(numberOfProduct)).forEach(() => {
      let product = {
        id: category.id,
        name: faker.commerce.productName(),
        price: Number.parseFloat(faker.commerce.price()),
        img: faker.image.image(),
        createdAt: Date.now(),
      };
      result.push(product);
    });
  }

  return result;
};
(() => {
  const categories = getCategories(5);
  const productsList = getProductList(categories, 12);

  const db = {
    categories: categories,
    products: productsList,
  };

  fs.writeFile("db.json", JSON.stringify(db), () => {
    console.log("generater data succes!");
  });
})();
