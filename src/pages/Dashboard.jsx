import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import useStore from '../store/useStore'
import DateInput from '../components/DateInput'
import Card from '../components/ui/Card'
import { format } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

export default function Dashboard() {
  const { sales, returns, repairs, purchaseHistory, inventory, expenses, ui } = useStore()
  const todayStr = new Date().toISOString().slice(0,10)
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const stats = useMemo(() => {
    const salesForDay = (sales||[]).filter(s => s.date === selectedDate)
    const invIdx = Object.fromEntries((inventory||[]).map(i => [i.id, i]))
    // Use actual paid amount: prefer sale.total (POS flow), fallback to sale.price
    const grossSalesPaid = salesForDay.reduce((sum, s) => sum + (Number(s.total ?? (Array.isArray(s.items)
      ? s.items.reduce((x,y)=> x + Number(y.price||0) * Number(y.qty||0), 0)
      : Number(s.price||0))) || 0), 0)
    // Subtract refunds happening on the selected date
    const refundsForDayAmount = (returns||[])
      .filter(r => (r.returnDate || r.date) === selectedDate)
      .reduce((a,r)=> a + Number(r.refundAmount||0), 0)
    const salesAmount = Math.max(grossSalesPaid - refundsForDayAmount, 0)
    const profitSelected = salesForDay.reduce((sum, s) => {
      if (Array.isArray(s.items)) {
        const p = s.items.reduce((acc, it) => {
          const inv = invIdx[it.id]
          const unitCost = Number(inv?.purchasePrice || inv?.unitCost || 0)
          const unitPrice = Number(it.price || 0)
          const qty = Number(it.qty || 0)
          return acc + (unitPrice - unitCost) * qty
        }, 0)
        return sum + p
      }
      return sum + Number(s.profit || 0)
    }, 0)
    // Subtract refund amounts from profit
    const profitAfterReturns = profitSelected - refundsForDayAmount
    const returnsForDay = (returns||[]).filter(r => (r.returnDate || r.date) === selectedDate)
    const expensesForDay = (expenses||[]).filter(e => e.date === selectedDate)
    const expensesAmount = expensesForDay.reduce((a,e)=> a + Number(e.amount||0), 0)
    // Net profit after expenses: Sales Amount - Expenses
    const netProfitAfterExpenses = salesAmount - expensesAmount
    // Total inventory items
    const totalInventoryItems = (inventory||[]).reduce((sum, inv) => sum + Number(inv.totalItems || 0), 0)
    // Items sold today
    const itemsSoldToday = salesForDay.reduce((sum, s) => {
      if (Array.isArray(s.items)) {
        return sum + s.items.reduce((acc, it) => acc + Number(it.qty || 0), 0)
      }
      return sum + 1
    }, 0)
    
    // Stock value calculations
    // Total current stock value (purchase price * quantity)
    const totalStockValue = (inventory||[]).reduce((sum, inv) => {
      const purchasePrice = Number(inv.purchasePrice || inv.unitCost || 0)
      const quantity = Number(inv.totalItems || 0)
      return sum + (purchasePrice * quantity)
    }, 0)
    
    // Stock value sold today (purchase price of items sold)
    const stockValueSoldToday = salesForDay.reduce((sum, s) => {
      if (Array.isArray(s.items)) {
        return sum + s.items.reduce((acc, it) => {
          const inv = invIdx[it.id]
          const unitCost = Number(inv?.purchasePrice || inv?.unitCost || 0)
          const qty = Number(it.qty || 0)
          return acc + (unitCost * qty)
        }, 0)
      }
      const inv = invIdx[s.mobileId]
      return sum + Number(inv?.purchasePrice || 0)
    }, 0)
    
    return {
      salesCount: salesForDay.length,
      salesAmount,
      returnsCount: returnsForDay.length,
      profitSelected: profitAfterReturns,
      expensesAmount,
      netProfitAfterExpenses,
      totalInventoryItems,
      itemsSoldToday,
      refundsAmount: refundsForDayAmount,
      totalStockValue,
      stockValueSoldToday,
      remainingStockValue: totalStockValue, // This is current stock, already excludes sold items
    }
  }, [sales, returns, inventory, expenses, selectedDate])

  // Company-wise bar: group by inventory category from sold items
  const companyData = useMemo(() => {
    const byCompany = {}
    const invIndex = Object.fromEntries((inventory||[]).map(i => [i.id, i]))
    ;(sales||[]).forEach(s => {
      if (Array.isArray(s.items)) {
        s.items.forEach(it => {
          const inv = invIndex[it.id]
          const key = inv?.category || 'Other'
          byCompany[key] = byCompany[key] || { units: 0, revenue: 0 }
          byCompany[key].units += Number(it.qty||0)
          byCompany[key].revenue += Number(it.qty||0) * Number(it.price||0)
        })
      }
    })
    const labels = Object.keys(byCompany)
    const units = labels.map(l => byCompany[l].units)
    const revenue = labels.map(l => byCompany[l].revenue)
    return {
      labels,
      datasets: [
        { label: 'Units Sold', data: units, backgroundColor: '#3b82f6' },
        { label: 'Revenue (PKR)', data: revenue, backgroundColor: '#60a5fa' },
      ]
    }
  }, [sales, inventory])

  // Monthly Sales & Profit bar
  const monthlyBar = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const salesByMonth = Array(12).fill(0)
    const profitByMonth = Array(12).fill(0)
    const expenseByMonth = Array(12).fill(0)
    const invIdx = Object.fromEntries((inventory||[]).map(i => [i.id, i]))
    ;(sales||[]).forEach(s => {
      const idx = new Date(`${s.date||''}T00:00:00`).getMonth()
      if (Number.isInteger(idx)) {
        // Use actual paid amount: prefer sale.total, fallback to legacy fields
        const totalPaid = Number(s.total ?? (Array.isArray(s.items)
          ? s.items.reduce((a,b)=> a + Number(b.price||0) * Number(b.qty||0), 0)
          : Number(s.price||0))) || 0
        const profit = Array.isArray(s.items)
          ? s.items.reduce((acc, it) => {
              const inv = invIdx[it.id]
              const unitCost = Number(inv?.purchasePrice || inv?.unitCost || 0)
              return acc + (Number(it.price||0) - unitCost) * Number(it.qty||0)
            }, 0)
          : Number(s.profit||0)
        salesByMonth[idx] += totalPaid
        profitByMonth[idx] += profit
      }
    })
    // Subtract refunds from monthly sales and profit (treat refund as negative revenue and profit)
    ;(returns||[]).forEach(r => {
      const idx = new Date(`${(r.returnDate || r.date) || ''}T00:00:00`).getMonth()
      if (Number.isInteger(idx)) {
        const amt = Number(r.refundAmount||0)
        salesByMonth[idx] -= amt
        profitByMonth[idx] -= amt
      }
    })
    ;(expenses||[]).forEach(e => {
      const idx = new Date(`${e.date||''}T00:00:00`).getMonth()
      if (Number.isInteger(idx)) expenseByMonth[idx] += Number(e.amount||0)
    })
    const netProfitByMonth = profitByMonth.map((p,i)=> p - expenseByMonth[i])
    return {
      labels: months,
      datasets: [
        { label: 'Sales (PKR)', data: salesByMonth.map(v=> Math.max(v,0)), backgroundColor: '#3b82f6' },
        { label: 'Net Profit (PKR)', data: netProfitByMonth, backgroundColor: '#10b981' },
      ]
    }
  }, [sales, returns, inventory, expenses])

  const recentForSelected = useMemo(() => {
    const list = (sales||[]).filter(s => s.date === selectedDate)
    // Newest first
    return [...list].reverse().slice(0, 8)
  }, [sales, selectedDate])

  return (
    <div className="space-y-4 md:space-y-6 page-transition">
      <h1 className="text-lg md:text-xl font-semibold dark:text-white">Dashboard</h1>
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Selected Date</div>
            <div className="font-medium dark:text-gray-200">{selectedDate}</div>
          </div>
          <div className="ml-auto sm:ml-0 flex items-center gap-2 w-full sm:w-auto">
            <DateInput value={selectedDate} onChange={setSelectedDate} popperPlacement="bottom-start" portalId="root" className="w-full sm:w-auto" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card title="Sales">
          <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{(stats.salesAmount||0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.salesCount} transactions</div>
        </Card>
        <Card title="Stock">
          <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{(stats.totalInventoryItems||0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Items in stock</div>
        </Card>
        <Card title="Sold Today">
          <div className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">{(stats.itemsSoldToday||0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Units sold</div>
        </Card>
        <Card title="Profit">
          <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{(stats.profitSelected||0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Today's profit</div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <Card title="Monthly Performance">
          <div className="h-64 md:h-80">
            <Bar data={monthlyBar} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 }, color: (ui?.darkMode ? '#94a3b8' : '#6b7280') } } },
              scales: { 
                x: { ticks: { font: { size: 10 }, color: (ui?.darkMode ? '#94a3b8' : '#6b7280') } }, 
                y: { ticks: { font: { size: 10 }, color: (ui?.darkMode ? '#94a3b8' : '#6b7280') } } 
              }
            }} />
          </div>
        </Card>
        <Card title="Company Performance">
          <div className="h-64 md:h-80">
            <Bar data={companyData} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 }, color: (ui?.darkMode ? '#94a3b8' : '#6b7280') } } },
              scales: { 
                x: { ticks: { font: { size: 10 }, color: (ui?.darkMode ? '#94a3b8' : '#6b7280') } }, 
                y: { ticks: { font: { size: 10 }, color: (ui?.darkMode ? '#94a3b8' : '#6b7280') } } 
              }
            }} />
          </div>
        </Card>
      </div>
    </div>
  )
}
