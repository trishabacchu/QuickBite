// Curated demo catalogue. Money is stored as integer paise: ₹249 = 24900.
// These restaurants are upserted by slug and dishes by restaurant + name, so
// running the seed repeatedly updates demo content without duplicating it.

const image = (photoId) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`;

export const restaurants = [
  {
    slug: 'spice-route',
    name: 'Spice Route',
    description:
      'Slow-cooked biryanis, rich North Indian curries, and tandoor breads from a kitchen that treats spice like a craft.',
    imageUrl: image('photo-1585937421612-70a008356fbe'),
    cuisine: 'North Indian',
    rating: 4.7,
    deliveryTimeMinutes: 32,
    deliveryFeePaise: 3900,
    isActive: true,
    openingTime: '10:00',
    closingTime: '23:30',
    timezone: 'Asia/Kolkata',
    foods: [
      {
        name: 'Hyderabadi Chicken Biryani',
        description:
          'Dum-cooked basmati rice layered with tender chicken, saffron, fried onions, and a cooling raita on the side.',
        pricePaise: 32900,
        imageUrl: image('photo-1563379091339-03246963d51a'),
        category: 'Biryani',
        isAvailable: true,
        preparationTimeMinutes: 25,
      },
      {
        name: 'Vegetable Dum Biryani',
        description:
          'Fragrant basmati rice sealed with garden vegetables, mint, whole spices, and crisp onions.',
        pricePaise: 27900,
        imageUrl: image('photo-1642821373181-696a54913e93'),
        category: 'Biryani',
        isAvailable: true,
        preparationTimeMinutes: 22,
      },
      {
        name: 'Butter Chicken',
        description:
          'Char-grilled chicken simmered in a silky tomato-butter gravy finished with cream and fenugreek.',
        pricePaise: 34900,
        imageUrl: image('photo-1603894584373-5ac82b2ae398'),
        category: 'Curries',
        isAvailable: true,
        preparationTimeMinutes: 20,
      },
      {
        name: 'Dal Makhani',
        description:
          'Black lentils cooked low and slow with butter, cream, and a gentle hit of smoked chilli.',
        pricePaise: 24900,
        imageUrl: image('photo-1546833999-b9f581a1996d'),
        category: 'Curries',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        name: 'Paneer Tikka',
        description:
          'Cubes of cottage cheese marinated in yoghurt and spices, charred with peppers and onion.',
        pricePaise: 26900,
        imageUrl: image('photo-1567188040759-fb8a883dc6d8'),
        category: 'Starters',
        isAvailable: true,
        preparationTimeMinutes: 16,
      },
      {
        name: 'Chicken Tikka',
        description:
          'Boneless chicken thigh in a smoky red marinade, grilled until juicy and served with mint chutney.',
        pricePaise: 29900,
        imageUrl: image('photo-1599487488170-d11ec9c172f0'),
        category: 'Starters',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        name: 'Garlic Naan',
        description:
          'Tandoor-baked flatbread brushed with garlic butter and fresh coriander.',
        pricePaise: 6900,
        imageUrl: image('photo-1601050690597-df0568f70950'),
        category: 'Breads',
        isAvailable: true,
        preparationTimeMinutes: 8,
      },
    ],
  },
  {
    slug: 'napoli-slice',
    name: 'Napoli Slice',
    description:
      'Blistered sourdough crusts, bright San Marzano tomato sauce, and generous toppings pulled hot from the oven.',
    imageUrl: image('photo-1574071318508-1cdbab80d002'),
    cuisine: 'Italian · Pizza',
    rating: 4.5,
    deliveryTimeMinutes: 26,
    deliveryFeePaise: 2900,
    isActive: true,
    openingTime: '11:00',
    closingTime: '23:00',
    timezone: 'Asia/Kolkata',
    foods: [
      {
        name: 'Margherita Pizza',
        description:
          'San Marzano tomato, fior di latte mozzarella, basil, olive oil, and a beautifully blistered crust.',
        pricePaise: 29900,
        imageUrl: image('photo-1574071318508-1cdbab80d002'),
        category: 'Pizza',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        name: 'Spicy Pepperoni Pizza',
        description:
          'House tomato sauce, mozzarella, pepperoni, chilli flakes, and hot honey for a sweet finish.',
        pricePaise: 39900,
        imageUrl: image('photo-1628840042765-356cda07504e'),
        category: 'Pizza',
        isAvailable: true,
        preparationTimeMinutes: 20,
      },
      {
        name: 'Truffle Mushroom Pizza',
        description:
          'Roasted mushrooms, mozzarella, parmesan, thyme, and a restrained drizzle of truffle oil.',
        pricePaise: 44900,
        imageUrl: image('photo-1513104890138-7c749659a591'),
        category: 'Pizza',
        isAvailable: true,
        preparationTimeMinutes: 22,
      },
      {
        name: 'Pesto Penne',
        description:
          'Penne tossed with basil pesto, cherry tomatoes, parmesan, and toasted pine nuts.',
        pricePaise: 28900,
        imageUrl: image('photo-1621996346565-e3dbc646d9a9'),
        category: 'Pasta',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        name: 'Classic Lasagna',
        description:
          'Layers of pasta, slow tomato ragù, béchamel, and bubbling mozzarella.',
        pricePaise: 34900,
        imageUrl: image('photo-1619895092538-128341789043'),
        category: 'Pasta',
        isAvailable: true,
        preparationTimeMinutes: 24,
      },
      {
        name: 'Garlic Breadsticks',
        description:
          'Soft baked sticks with garlic butter, parsley, and a side of marinara for dipping.',
        pricePaise: 15900,
        imageUrl: image('photo-1573140247632-f8fd74997d5c'),
        category: 'Sides',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        name: 'Caesar Salad',
        description:
          'Crisp romaine, parmesan shavings, herb croutons, and a creamy black-pepper dressing.',
        pricePaise: 21900,
        imageUrl: image('photo-1546793665-c74683f339c1'),
        category: 'Salads',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
    ],
  },
  {
    slug: 'burger-barn',
    name: 'Burger Barn',
    description:
      'Smashed patties, toasted brioche, crunchy fries, and thick shakes. Unapologetically good comfort food.',
    imageUrl: image('photo-1568901346375-23c9450c58cd'),
    cuisine: 'American · Burgers',
    rating: 4.4,
    deliveryTimeMinutes: 24,
    deliveryFeePaise: 2500,
    isActive: true,
    // Cross-midnight example: open from 11:00 until 02:00 the next day.
    openingTime: '11:00',
    closingTime: '02:00',
    timezone: 'Asia/Kolkata',
    foods: [
      {
        name: 'Classic Cheeseburger',
        description:
          'Two smashed patties, aged cheddar, pickles, onion, and Barn sauce in a toasted brioche bun.',
        pricePaise: 27900,
        imageUrl: image('photo-1568901346375-23c9450c58cd'),
        category: 'Burgers',
        isAvailable: true,
        preparationTimeMinutes: 15,
      },
      {
        name: 'Smoky BBQ Chicken Burger',
        description:
          'Crispy chicken thigh, smoked cheddar, slaw, pickles, and smoky barbecue sauce.',
        pricePaise: 31900,
        imageUrl: image('photo-1550547660-d9450f859349'),
        category: 'Burgers',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        name: 'Crispy Veggie Burger',
        description:
          'Golden vegetable patty, lettuce, tomato, pickled onion, and garlic aioli.',
        pricePaise: 23900,
        imageUrl: image('photo-1520072959219-c595dc870360'),
        category: 'Burgers',
        isAvailable: true,
        preparationTimeMinutes: 15,
      },
      {
        name: 'Peri Peri Chicken Wings',
        description:
          'Six crisp wings tossed in a bright, fiery peri peri glaze with a cooling ranch dip.',
        pricePaise: 29900,
        imageUrl: image('photo-1527477396000-e27163b481c2'),
        category: 'Sides',
        // Deliberately unavailable for the lab demonstration.
        isAvailable: false,
        preparationTimeMinutes: 20,
      },
      {
        name: 'Loaded Cheese Fries',
        description:
          'Skin-on fries smothered with cheddar sauce, jalapeños, crisp onions, and herbs.',
        pricePaise: 18900,
        imageUrl: image('photo-1573080496219-bb080dd4f877'),
        category: 'Sides',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },
      {
        name: 'Salted Caramel Shake',
        description:
          'Thick vanilla ice-cream shake blended with salted caramel and topped with whipped cream.',
        pricePaise: 17900,
        imageUrl: image('photo-1572490122747-3968b75cc699'),
        category: 'Beverages',
        isAvailable: true,
        preparationTimeMinutes: 7,
      },
      {
        name: 'Chocolate Brownie',
        description:
          'A fudgy cocoa brownie with melted dark chocolate pockets, served warm.',
        pricePaise: 14900,
        imageUrl: image('photo-1606313564200-e75d5e30476c'),
        category: 'Desserts',
        isAvailable: true,
        preparationTimeMinutes: 8,
      },
    ],
  },
  {
    slug: 'wok-and-roll',
    name: 'Wok & Roll',
    description:
      'High-heat wok cooking, punchy Indo-Chinese flavours, and noodle bowls built for sharing.',
    imageUrl: image('photo-1585032226651-759b368d7246'),
    cuisine: 'Chinese · Asian',
    rating: 4.3,
    deliveryTimeMinutes: 34,
    deliveryFeePaise: 3500,
    isActive: true,
    openingTime: '11:30',
    closingTime: '22:45',
    timezone: 'Asia/Kolkata',
    foods: [
      {
        name: 'Chicken Hakka Noodles',
        description:
          'Wok-tossed noodles with shredded chicken, crunchy vegetables, soy, and a whisper of chilli.',
        pricePaise: 24900,
        imageUrl: image('photo-1585032226651-759b368d7246'),
        category: 'Rice & Noodles',
        isAvailable: true,
        preparationTimeMinutes: 16,
      },
      {
        name: 'Burnt Garlic Fried Rice',
        description:
          'Long-grain rice fried with garlic, spring onion, egg, and toasted sesame.',
        pricePaise: 22900,
        imageUrl: image('photo-1603133872878-684f208fb84b'),
        category: 'Rice & Noodles',
        isAvailable: true,
        preparationTimeMinutes: 15,
      },
      {
        name: 'Chicken Manchurian',
        description:
          'Crisp chicken pieces glazed in a tangy ginger-garlic Manchurian sauce.',
        pricePaise: 27900,
        imageUrl: image('photo-1626804475297-41608ea09aeb'),
        category: 'Chinese',
        isAvailable: true,
        preparationTimeMinutes: 20,
      },
      {
        name: 'Chilli Paneer',
        description:
          'Paneer, peppers, and onion tossed in a glossy chilli sauce with a hit of vinegar.',
        pricePaise: 25900,
        imageUrl: image('photo-1567188040759-fb8a883dc6d8'),
        category: 'Chinese',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        name: 'Steamed Chicken Dumplings',
        description:
          'Six delicate dumplings filled with ginger chicken, served with chilli-soy dipping sauce.',
        pricePaise: 26900,
        imageUrl: image('photo-1563245372-f21724e3856d'),
        category: 'Starters',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        name: 'Vegetable Spring Rolls',
        description:
          'Crisp rolls packed with cabbage, carrot, and glass noodles with a sweet chilli dip.',
        pricePaise: 17900,
        imageUrl: image('photo-1544025162-d76694265947'),
        category: 'Starters',
        isAvailable: false,
        preparationTimeMinutes: 14,
      },
      {
        name: 'Hot & Sour Soup',
        description:
          'A peppery, tangy broth with mushrooms, tofu, vegetables, and a ribbon of egg.',
        pricePaise: 13900,
        imageUrl: image('photo-1547592180-85f173990554'),
        category: 'Soups',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
    ],
  },
  {
    slug: 'sugar-and-spice',
    name: 'Sugar & Spice',
    description:
      'Small-batch cakes, warm waffles, and pretty desserts made for slow afternoons and midnight cravings.',
    imageUrl: image('photo-1578985545062-69928b1d9587'),
    cuisine: 'Desserts · Bakery',
    rating: 4.8,
    deliveryTimeMinutes: 28,
    deliveryFeePaise: 4900,
    isActive: true,
    // Deliberately narrow window so a closed restaurant is available for the
    // lab demo at almost any presentation time. It is still driven by stored
    // opening hours, not a manually toggled isOpen flag.
    openingTime: '03:00',
    closingTime: '03:15',
    timezone: 'Asia/Kolkata',
    foods: [
      {
        name: 'Belgian Chocolate Cake',
        description:
          'Dark chocolate sponge layered with silky ganache and finished with cocoa nibs.',
        pricePaise: 24900,
        imageUrl: image('photo-1578985545062-69928b1d9587'),
        category: 'Cakes',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },
      {
        name: 'New York Cheesecake',
        description:
          'Dense vanilla cheesecake on a buttery biscuit base with a tart berry compote.',
        pricePaise: 26900,
        imageUrl: image('photo-1533134242443-d4fd215305ad'),
        category: 'Desserts',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        name: 'Tiramisu Cup',
        description:
          'Espresso-soaked ladyfingers, mascarpone cream, and a generous dusting of cocoa.',
        pricePaise: 23900,
        imageUrl: image('photo-1571877227200-a0d98ea607e9'),
        category: 'Desserts',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        name: 'Nutella Waffle',
        description:
          'Crisp-edged waffle with warm Nutella, toasted hazelnuts, and a cloud of whipped cream.',
        pricePaise: 21900,
        imageUrl: image('photo-1562376552-0d160a2f238d'),
        category: 'Desserts',
        isAvailable: true,
        preparationTimeMinutes: 14,
      },
      {
        name: 'Vanilla Bean Gelato',
        description:
          'Two scoops of slow-churned vanilla bean gelato with a dark chocolate shard.',
        pricePaise: 15900,
        imageUrl: image('photo-1563805042-7684c019e1cb'),
        category: 'Desserts',
        isAvailable: true,
        preparationTimeMinutes: 5,
      },
      {
        name: 'Glazed Cinnamon Donut',
        description:
          'A pillowy brioche donut rolled in cinnamon sugar and finished with vanilla glaze.',
        pricePaise: 11900,
        imageUrl: image('photo-1551024506-0bccd828d307'),
        category: 'Bakery',
        isAvailable: true,
        preparationTimeMinutes: 6,
      },
      {
        name: 'Iced Filter Coffee',
        description:
          'Slow-brewed South Indian filter coffee shaken with milk and served over ice.',
        pricePaise: 12900,
        imageUrl: image('photo-1495474472287-4d71bcdd2085'),
        category: 'Beverages',
        isAvailable: true,
        preparationTimeMinutes: 6,
      },
    ],
  },
];

export const demoCustomer = {
  name: 'Demo Customer',
  phone: '9876543210',
  address: {
    label: 'Home',
    line1: '12 Lake View Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
  },
};
