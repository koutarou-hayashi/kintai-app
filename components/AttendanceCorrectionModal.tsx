// components/AttendanceCorrectionModal.tsx
'use client'

import { useState } from 'react'

type Props = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AttendanceCorrectionModal({ isOpen, onClose, onSuccess }: Props) {
    const [targetDate, setTargetDate] = useState('')
    const [newClockInTime, setNewClockInTime] = useState('')
    const [newClockOutTime, setNewClockOutTime] = useState('')
    const [newBreakMinutes, setNewBreakMinutes] = useState('60')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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
            // 日付と時間を結合して ISO 形式（または Date に変換できる文字列）にする
            const clockInISO = newClockInTime ? new Date(`${targetDate}T${newClockInTime}`).toISOString() : null
            const clockOutISO = newClockOutTime ? new Date(`${targetDate}T${newClockOutTime}`).toISOString() : null

            const res = await fetch('/api/attendance/corrections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
                    <h2 className="text-lg font-bold text-gray-800">打刻修正の申請</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 font-bold text-xl"
                    >
                        &times;
                    </button>
                </div>

                {error && (
                    <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 対象日 */}
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

                    {/* 希望の出勤時刻 */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">希望出勤時刻</label>
                        <input
                            type="time"
                            value={newClockInTime}
                            onChange={(e) => setNewClockInTime(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* 希望の退勤時刻 */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">希望退勤時刻</label>
                        <input
                            type="time"
                            value={newClockOutTime}
                            onChange={(e) => setNewClockOutTime(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* 休憩時間（分） */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">休憩時間（分）</label>
                        <input
                            type="number"
                            value={newBreakMinutes}
                            onChange={(e) => setNewBreakMinutes(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* 修正理由 */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">修正理由 *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={3}
                            placeholder="例：打刻ボタンを押し忘れたため、09:00出勤に修正をお願いします。"
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* ボタン */}
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