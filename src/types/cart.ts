export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
  unit: string
}

export type FulfillmentType = 'delivery' | 'pickup'

export interface CheckoutFormData {
  fullName: string
  email: string
  phone: string
  address: string
  zip: string
  fulfillmentType: FulfillmentType
  paymentMethod: 'cod' | 'card' // Cash on Delivery or Test Card
  notes?: string
}

export interface CreateOrderPayload {
  userId?: string
  fulfillmentType: FulfillmentType
  deliveryZip?: string
  total: number
  items: {
    productId: string
    quantity: number
    priceAtOrder: number
  }[]
  customerDetails: {
    fullName: string
    email: string
    phone: string
    address: string
  }
}