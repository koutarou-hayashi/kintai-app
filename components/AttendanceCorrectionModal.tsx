// components/AttendanceCorrectionModal.tsx
'use client'

import { useState, useEffect } from 'react'

type AttendanceRecord = {
    id: string
    date: string // "YYYY/MM/DD" など
    clockInTime: string // "HH:mm" など
    clockOutTime: string // "HH:mm" など
}

type Props = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    targetRecord?: AttendanceRecord | null // ★ 選択した行のデータを受け取る
}

export default function AttendanceCorrectionModal({ isOpen, onClose, onSuccess, targetRecord }: Props) {
    const [targetDate, setTargetDate] = useState('')
    const [newClockInTime, setNewClockInTime] = useState('')
    const [newClockOutTime, setNewClockOutTime] = useState('')
    const [newBreakMinutes, setNewBreakMinutes] = useState('60')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // モーダルが開かれたとき、または選択レコードが変わったときに初期値をセット
    useEffect(() => {
        if (targetRecord) {
            // rawDateがあればそれを使い、無ければ "YYYY/MM/DD" から "YYYY-MM-DD" に変換
            let formattedDate = targetRecord.rawDate || ''

            if (!formattedDate && targetRecord.date) {
                // "2026/11/07 (土)" などの文字列から "YYYY-MM-DD" 部分だけを抽出
                const match = targetRecord.date.match(/\d{4}[\/\-]\d{2}[\/\-]\d{2}/)
                if (match) {
                    formattedDate = match[0].replace(/\//g, '-')
                }
            }

            setTargetDate(formattedDate)
            setNewClockInTime(targetRecord.clockInTime && targetRecord.clockInTime !== '-' ? targetRecord.clockInTime : '')
            setNewClockOutTime(targetRecord.clockOutTime && targetRecord.clockOutTime !== '-' ? targetRecord.clockOutTime : '')
        } else {
            const todayStr = new Date().toISOString().split('T')[0]
            setTargetDate(todayStr)
            setNewClockInTime('')
            setNewClockOutTime('')
        }
        setNewBreakMinutes('60')
        setReason('')
        setError('')
    }, [targetRecord, isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!targetDate || !reason) {
            setError('対象日と修正理由は必須です。')
            return
        }

        setLoading(true)
        setError('')

        try {
            const clockInISO = newClockInTime ? new Date(`${targetDate}T${newClockInTime}`).toISOString() : null
            const clockOutISO = newClockOutTime ? new Date(`${targetDate}T${newClockOutTime}`).toISOString() : null

            const res = await fetch('/api/attendance/corrections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendanceId: targetRecord ? targetRecord.id : null, // 既存の打刻IDがあれば渡す
                    targetDate,
                    newClockInTime: clockInISO,
                    newClockOutTime: clockOutISO,
                    newBreakMinutes: parseInt(newBreakMinutes, 10) || 0,
                    reason,
                }),
            })

            const data = await res.json()
            if (data.success) {
                alert('打刻修正の申請を送信しました。')
                onSuccess()
                onClose()
            } else {
                setError(data.error || '申請に失敗しました。')
            }
        } catch (err) {
            setError('通信エラーが発生しました。')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-lg font-bold text-gray-800">
                        {targetRecord ? `${targetRecord.date} の修正申請` : '打刻修正の申請'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">対象日 *</label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">希望出勤時刻</label>
                        <input
                            type="time"
                            value={newClockInTime}
                            onChange={(e) => setNewClockInTime(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">希望退勤時刻</label>
                        <input
                            type="time"
                            value={newClockOutTime}
                            onChange={(e) => setNewClockOutTime(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">休憩時間（分）</label>
                        <input
                            type="number"
                            value={newBreakMinutes}
                            onChange={(e) => setNewBreakMinutes(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">修正理由 *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={3}
                            placeholder="例：打刻時間の記録に誤りがあったため修正をお願いします。"
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                        >
                            {loading ? '送信中...' : '申請する'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}