import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import DateInput from '../components/DateInput'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'

export default function CompanyReports() {
  const { inventory, sales, returns } = useStore()
  const todayStr = new Date().toISOString().slice(0,10)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedCompany, setSelectedCompany] = useState(null)

  // Group inventory and sales by company
  const companyStats = useMemo(() => {
    const companies = {}
    const invIdx = Object.fromEntries((inventory||[]).map(i => [i.id, i]))

    // First, gather all inventory by company
    ;(inventory||[]).forEach(inv => {
      const company = inv.category || inv.company || 'Other'
      if (!companies[company]) {
        companies[company] = {
          name: company,
          totalMobiles: 0,
          soldToday: 0,
          remaining: 0,
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          refunds: 0,
          mobiles: []
        }
      }
      const qty = Number(inv.totalItems || 0)
      companies[company].totalMobiles += qty
      companies[company].remaining += qty
      companies[company].mobiles.push({
        id: inv.id,
        name: inv.name,
        totalItems: qty,
        purchasePrice: Number(inv.purchasePrice || 0),
        soldToday: 0,
        revenueToday: 0,
        profitToday: 0,
        salesDetails: [] // Track individual sales with prices
      })
    })

    // Then, calculate sales for selected date
    const salesForDay = (sales||[]).filter(s => s.date === selectedDate)
    salesForDay.forEach(sale => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach(it => {
          const inv = invIdx[it.id]
          if (!inv) return
          const company = inv.category || inv.company || 'Other'
          if (!companies[company]) return

          const qty = Number(it.qty || 0)
          const price = Number(it.price || 0)
          const cost = Number(inv.purchasePrice || 0)
          const revenue = qty * price
          const profit = qty * (price - cost)

          companies[company].soldToday += qty
          companies[company].totalRevenue += revenue
          companies[company].totalCost += (qty * cost)
          companies[company].profit += profit

          // Update mobile-level stats
          const mobile = companies[company].mobiles.find(m => m.id === it.id)
          if (mobile) {
            mobile.soldToday += qty
            mobile.revenueToday += revenue
            mobile.profitToday += profit
            // Track sale details
            mobile.salesDetails.push({
              qty,
              salePrice: price,
              totalAmount: revenue,
              profit: profit
            })
          }
        })
      }
    })

    // Subtract returns/refunds for selected date
    const returnsForDay = (returns||[]).filter(r => (r.returnDate || r.date) === selectedDate)
    returnsForDay.forEach(returnItem => {
      const inv = invIdx[returnItem.inventoryId]
      if (!inv) return
      const company = inv.category || inv.company || 'Other'
      if (!companies[company]) return
      
      const refundAmount = Number(returnItem.refundAmount || 0)
      companies[company].refunds += refundAmount
      companies[company].profit -= refundAmount
      
      // Also deduct from mobile-level stats
      const mobile = companies[company].mobiles.find(m => m.id === returnItem.inventoryId)
      if (mobile) {
        mobile.profitToday -= refundAmount
        mobile.revenueToday -= refundAmount
      }
    })

    return Object.values(companies).sort((a, b) => b.totalMobiles - a.totalMobiles)
  }, [inventory, sales, returns, selectedDate])

  const selectedCompanyDetails = useMemo(() => {
    if (!selectedCompany) return null
    return companyStats.find(c => c.name === selectedCompany)
  }, [companyStats, selectedCompany])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-semibold">Company-wise Reports</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by Date:</span>
          <DateInput value={selectedDate} onChange={setSelectedDate} popperPlacement="bottom-end" portalId="root" />
        </div>
      </div>

      <Card>
        <div className="text-sm text-gray-600 mb-2">
          Showing data for: <span className="font-semibold text-gray-900">{selectedDate}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {companyStats.map((company) => (
          <Card 
            key={company.name}
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-400"
            onClick={() => setSelectedCompany(company.name)}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800">{company.name}</h3>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Mobiles:</span>
                  <span className="font-semibold text-blue-600">{company.totalMobiles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sold Today:</span>
                  <span className="font-semibold text-orange-600">{company.soldToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-semibold text-purple-600">{company.remaining}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Profit Today:</span>
                  <span className={`font-semibold ${company.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {company.profit >= 0 ? '+' : ''}{company.profit.toLocaleString()} PKR
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {companyStats.length === 0 && (
        <Card>
          <div className="text-center py-8 text-gray-500">
            No company data available. Add inventory items to see reports.
          </div>
        </Card>
      )}

      {/* Company Details Modal */}
      <Modal
        open={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        title={`${selectedCompany || ''} - Detailed Report`}
      >
        {selectedCompanyDetails && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600 font-medium">Total Stock</div>
                <div className="text-xl font-bold text-blue-700">{selectedCompanyDetails.totalMobiles}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-xs text-orange-600 font-medium">Sold Today</div>
                <div className="text-xl font-bold text-orange-700">{selectedCompanyDetails.soldToday}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-purple-600 font-medium">Remaining</div>
                <div className="text-xl font-bold text-purple-700">{selectedCompanyDetails.remaining}</div>
              </div>
              <div className={`${selectedCompanyDetails.profit >= 0 ? 'bg-green-50' : 'bg-red-50'} p-3 rounded-lg`}>
                <div className={`text-xs font-medium ${selectedCompanyDetails.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedCompanyDetails.profit >= 0 ? 'Profit' : 'Loss'}
                </div>
                <div className={`text-xl font-bold ${selectedCompanyDetails.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {selectedCompanyDetails.profit.toLocaleString()} PKR
                </div>
              </div>
            </div>

            {/* Revenue & Cost Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-3">Financial Summary ({selectedDate})</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Revenue:</span>
                  <span className="font-semibold text-green-600">{selectedCompanyDetails.totalRevenue.toLocaleString()} PKR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold text-red-600">{selectedCompanyDetails.totalCost.toLocaleString()} PKR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Refunds/Returns:</span>
                  <span className="font-semibold text-orange-600">{selectedCompanyDetails.refunds.toLocaleString()} PKR</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-gray-700">Net Profit/Loss:</span>
                  <span className={`font-bold ${selectedCompanyDetails.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedCompanyDetails.profit >= 0 ? '+' : ''}{selectedCompanyDetails.profit.toLocaleString()} PKR
                  </span>
                </div>
                <div className="text-xs text-gray-500 italic mt-1">
                  (After deducting returns)
                </div>
              </div>
            </div>

            {/* Mobile List */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Mobile Models Details</h4>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-700">Model</th>
                      <th className="text-right p-2 font-medium text-gray-700">Purchase Price</th>
                      <th className="text-right p-2 font-medium text-gray-700">Stock</th>
                      <th className="text-right p-2 font-medium text-gray-700">Sold Today</th>
                      <th className="text-right p-2 font-medium text-gray-700">Sale Price</th>
                      <th className="text-right p-2 font-medium text-gray-700">Revenue</th>
                      <th className="text-right p-2 font-medium text-gray-700">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedCompanyDetails.mobiles.map((mobile) => (
                      <tr key={mobile.id} className="hover:bg-gray-50">
                        <td className="p-2 text-gray-800">
                          <div className="font-medium">{mobile.name}</div>
                          {mobile.salesDetails.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {mobile.salesDetails.map((sale, idx) => (
                                <div key={idx}>
                                  {sale.qty} × {sale.salePrice.toLocaleString()} PKR
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right text-blue-600 font-medium">
                          {mobile.purchasePrice.toLocaleString()} PKR
                        </td>
                        <td className="p-2 text-right text-purple-600 font-medium">{mobile.totalItems}</td>
                        <td className="p-2 text-right text-orange-600 font-medium">
                          {mobile.soldToday > 0 ? mobile.soldToday : '-'}
                        </td>
                        <td className="p-2 text-right text-indigo-600 font-medium">
                          {mobile.salesDetails.length > 0 ? (
                            <div>
                              {mobile.salesDetails.map((sale, idx) => (
                                <div key={idx}>{sale.salePrice.toLocaleString()} PKR</div>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-2 text-right text-green-600 font-medium">
                          {mobile.revenueToday > 0 ? `${mobile.revenueToday.toLocaleString()} PKR` : '-'}
                        </td>
                        <td className={`p-2 text-right font-medium ${mobile.profitToday >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {mobile.profitToday !== 0 ? `${mobile.profitToday >= 0 ? '+' : ''}${mobile.profitToday.toLocaleString()} PKR` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
