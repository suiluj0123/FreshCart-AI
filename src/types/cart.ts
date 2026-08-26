export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
  unit: string
}

export type FulfillmentType = 'delivery' | 'pickup'

export type PaymentMethod = 'cash' | 'card' | 'ewallet'

export interface CheckoutFormData {
  fullName: string
  email: string
  phone: string
  address: string
  landmark?: string
  zip?: string
  fulfillmentType: FulfillmentType
  paymentMethod: PaymentMethod
  notes?: string
}

export interface CreateOrderPayload {
  userId?: string
  fulfillmentType: FulfillmentType
  paymentMethod?: PaymentMethod
  deliveryAddress?: string
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
    landmark?: string
  }
}