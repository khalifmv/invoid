import { useEffect, useMemo } from 'react'
import { Card, CardTitle } from '../components/ui/Card'
import { createCurrencyFormatter } from '../lib/currency'
import { useTransactionStore } from '../store/transactionStore'
import { useSettingsStore } from '../store/settingsStore'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)

export function DashboardPage() {
    const currencyCode = useSettingsStore((state) => state.currency)
    const { historyTransactions, loadTransactions } = useTransactionStore()

    useEffect(() => {
        void loadTransactions()
    }, [loadTransactions])

    const currency = useMemo(() => createCurrencyFormatter(currencyCode), [currencyCode])

    const totalRevenue = useMemo(
        () => historyTransactions.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
        [historyTransactions],
    )
    const outstandingRevenue = useMemo(
        () => historyTransactions.filter((i) => i.status !== 'paid').reduce((sum, inv) => sum + inv.total, 0),
        [historyTransactions],
    )
    const totalTransactions = historyTransactions.length

    const chartData = useMemo(() => {
        const dates: Record<string, number> = {}
        const now = new Date()

        for (let i = 29; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const dateString = d.toISOString().split('T')[0]
            dates[dateString] = 0
        }

        historyTransactions.forEach((inv) => {
            const invDate = new Date(inv.createdAt).toISOString().split('T')[0]
            if (dates[invDate] !== undefined && inv.status === 'paid') {
                dates[invDate] += inv.total
            }
        })

        const labels = Object.keys(dates).map((d) => {
            const dateObj = new Date(d)
            return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
        })
        const data = Object.values(dates)

        return {
            labels,
            datasets: [
                {
                    fill: true,
                    label: 'Revenue',
                    data,
                    borderColor: 'rgb(53, 162, 235)',
                    backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    tension: 0.3,
                },
            ],
        }
    }, [historyTransactions])

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    }

    return (
        <section className="mx-auto grid w-full gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <CardTitle>Total Revenue</CardTitle>
                    <p className="mt-2 text-3xl font-bold text-zinc-900">{currency.format(totalRevenue)}</p>
                </Card>
                <Card>
                    <CardTitle>Outstanding Payments</CardTitle>
                    <p className="mt-2 text-3xl font-bold text-red-600">{currency.format(outstandingRevenue)}</p>
                </Card>
                <Card>
                    <CardTitle>Total Transactions</CardTitle>
                    <p className="mt-2 text-3xl font-bold text-zinc-900">{totalTransactions}</p>
                </Card>
            </div>

            <Card className="h-96">
                <CardTitle>Revenue (Last 30 Days)</CardTitle>
                <div className="mt-4 h-[300px] w-full">
                    <Line options={chartOptions} data={chartData} />
                </div>
            </Card>
        </section>
    )
}
