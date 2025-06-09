import { gql } from '@apollo/client';

// Fragment for common restaurant fields
export const RESTAURANT_FRAGMENT = gql`
  fragment RestaurantFields on Restaurant {
    id
    name
    description
    cuisineType
    rating
    deliveryTime
    deliveryFee
    address
    image
    isOpen
    coordinates {
      latitude
      longitude
    }
    distance
    openingHours {
      day
      openTime
      closeTime
    }
  }
`;

// Fragment for common food item fields
export const FOOD_ITEM_FRAGMENT = gql`
  fragment FoodItemFields on FoodItem {
    id
    name
    description
    price
    image
    category
    popular
    options {
      id
      name
      required
      multiSelect
      choices {
        id
        name
        price
      }
    }
  }
`;

// Fragment for common order fields
export const ORDER_FRAGMENT = gql`
  fragment OrderFields on FoodOrder {
    id
    restaurantId
    restaurantName
    restaurantImage
    status
    items {
      id
      name
      quantity
      price
      options {
        name
        choice
        price
      }
    }
    subtotal
    deliveryFee
    tax
    total
    deliveryAddress
    deliveryTime
    paymentMethod
    createdAt
  }
`;

// Queries
export const GET_RESTAURANTS = gql`
  query GetRestaurants($latitude: Float!, $longitude: Float!, $cuisineType: String) {
    restaurants(latitude: $latitude, longitude: $longitude, cuisineType: $cuisineType) {
      ...RestaurantFields
    }
  }
  ${RESTAURANT_FRAGMENT}
`;

export const GET_RESTAURANT_DETAILS = gql`
  query GetRestaurantDetails($id: ID!) {
    restaurant(id: $id) {
      ...RestaurantFields
      menu {
        categories {
          name
          items {
            ...FoodItemFields
          }
        }
      }
    }
  }
  ${RESTAURANT_FRAGMENT}
  ${FOOD_ITEM_FRAGMENT}
`;

export const GET_CUISINE_TYPES = gql`
  query GetCuisineTypes {
    cuisineTypes {
      id
      name
      image
    }
  }
`;

export const GET_FOOD_ORDERS = gql`
  query GetFoodOrders {
    foodOrders {
      ...OrderFields
    }
  }
  ${ORDER_FRAGMENT}
`;

export const GET_FOOD_ORDER = gql`
  query GetFoodOrder($id: ID!) {
    foodOrder(id: $id) {
      ...OrderFields
      rider {
        id
        name
        phone
        photo
        currentLocation {
          latitude
          longitude
        }
      }
      estimatedDeliveryTime
    }
  }
  ${ORDER_FRAGMENT}
`;

// Mutations
export const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      id
      restaurantId
      items {
        id
        name
        quantity
        price
        options {
          name
          choice
          price
        }
      }
      subtotal
    }
  }
`;

export const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($input: RemoveFromCartInput!) {
    removeFromCart(input: $input) {
      id
      restaurantId
      items {
        id
        name
        quantity
        price
        options {
          name
          choice
          price
        }
      }
      subtotal
    }
  }
`;

export const CLEAR_CART = gql`
  mutation ClearCart {
    clearCart {
      success
    }
  }
`;

export const PLACE_FOOD_ORDER = gql`
  mutation PlaceFoodOrder($input: PlaceFoodOrderInput!) {
    placeFoodOrder(input: $input) {
      ...OrderFields
    }
  }
  ${ORDER_FRAGMENT}
`;

export const CANCEL_FOOD_ORDER = gql`
  mutation CancelFoodOrder($id: ID!) {
    cancelFoodOrder(id: $id) {
      ...OrderFields
    }
  }
  ${ORDER_FRAGMENT}
`;

// Subscriptions
export const FOOD_ORDER_STATUS_UPDATED = gql`
  subscription FoodOrderStatusUpdated($orderId: ID!) {
    foodOrderStatusUpdated(orderId: $orderId) {
      ...OrderFields
      rider {
        id
        name
        phone
        photo
        currentLocation {
          latitude
          longitude
        }
      }
      estimatedDeliveryTime
    }
  }
  ${ORDER_FRAGMENT}
`;

export const FOOD_ORDER_LOCATION_UPDATED = gql`
  subscription FoodOrderLocationUpdated($orderId: ID!) {
    foodOrderLocationUpdated(orderId: $orderId) {
      orderId
      riderLocation {
        latitude
        longitude
      }
      estimatedDeliveryTime
    }
  }
`;
