const User = require('../src/models/User');
const Sweet = require('../src/models/Sweet');

describe('Model validation (no DB)', () => {

  test('User missing email fails', () => {
    const u = new User({ password: '123456' });
    const err = u.validateSync();
    expect(err).toBeTruthy();
    expect(err.errors).toHaveProperty('email');
  });

  test('Sweet negative price fails', () => {
    const s = new Sweet({
      name: 'Bad Sweet',
      category: 'Milk',
      price: -10,
      quantity: 5,
      imageUrl: 'http://example.com/bad.jpg'
    });

    const err = s.validateSync();
    expect(err).toBeTruthy();
    expect(err.errors).toHaveProperty('price');
  });

  test('Sweet valid data passes', () => {
    const s = new Sweet({
      name: 'Ladoo',
      category: 'Milk',
      price: 20,
      quantity: 3,
      imageUrl: 'http://example.com/ladoo.jpg'
    });

    expect(s.validateSync()).toBeUndefined();
  });
});
