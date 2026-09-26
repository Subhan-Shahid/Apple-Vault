import React from 'react'

const Bill = React.forwardRef(({ shop, customer, item, totals }, ref) => {
  return (
    <div ref={ref} className="p-6 max-w-3xl mx-auto bg-white text-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <p className="text-sm text-gray-600">{shop.address}</p>
          <p className="text-sm text-gray-600">{shop.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold">Sales Invoice</h2>
          <p className="text-sm text-gray-600">Bill No: {totals.billNo}</p>
          <p className="text-sm text-gray-600">Date: {totals.date}</p>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-1">Customer</h3>
        <div className="text-sm">
          <p>{customer.name}</p>
          <p>{customer.phone}</p>
          <p>{customer.cnic}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2">Company</th>
            <th className="text-left p-2">Model</th>
            <th className="text-left p-2">Color</th>
            <th className="text-left p-2">IMEI</th>
            <th className="text-right p-2">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2">{item.company}</td>
            <td className="p-2">{item.model}</td>
            <td className="p-2">{item.color}</td>
            <td className="p-2">{item.imei}</td>
            <td className="p-2 text-right">{totals.amount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span>Subtotal</span><span>{totals.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 font-semibold border-t mt-2">
            <span>Total</span><span>{totals.amount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-8">Thank you for your business!</p>
    </div>
  )
})

export default Bill
