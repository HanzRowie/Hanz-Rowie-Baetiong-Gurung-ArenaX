import React, { useState, useEffect } from 'react';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { api } from '../services/api';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Transaction {
    id: string;
    type: 'EARNING' | 'WITHDRAWAL';
    amount: number;
    date: string;
    note: string;
}

interface WalletData {
    wallet_balance: number;
    recent_transactions: Transaction[];
}

const WalletPage: React.FC = () => {
    const [data, setData] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Withdrawal State
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/api/payments/wallet/');
            setData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch wallet data');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
            setWithdrawError('Please enter a valid amount to withdraw.');
            return;
        }

        if (data && Number(withdrawAmount) > data.wallet_balance) {
            setWithdrawError('Insufficient funds.');
            return;
        }

        try {
            setIsWithdrawing(true);
            setWithdrawError(null);
            setWithdrawSuccess(null);

            const response = await api.post('/api/payments/wallet/withdraw/', {
                amount: Number(withdrawAmount)
            });

            setWithdrawSuccess(`Successfully withdrew NPR ${response.data.withdrawn_amount}`);
            setWithdrawAmount('');

            // Refresh wallet data immediately
            await fetchWalletData();

            // Clear success message after 5 seconds
            setTimeout(() => setWithdrawSuccess(null), 5000);

        } catch (err: any) {
            setWithdrawError(err.response?.data?.error || 'Withdrawal failed. Please try again.');
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <LoadingSkeleton />
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="space-y-6">
                <Card className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load wallet</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={fetchWalletData} className="bg-purple-600">
                        Retry
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                        <Wallet className="w-7 h-7 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Virtual Wallet</h1>
                        <p className="text-gray-500 font-medium">Manage your earnings and secure payouts</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Stats & Withdraw Action) */}
                <div className="space-y-6">
                    {/* Balance Card */}
                    <Card className="p-8 bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg overflow-hidden relative">
                        {/* Background design elements */}
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Activity className="w-32 h-32" />
                        </div>

                        <div className="relative z-10">
                            <p className="text-purple-100 font-medium text-lg mb-2">Available Balance</p>
                            <h2 className="text-5xl font-extrabold tracking-tight mb-6">
                                <span className="text-purple-200 text-3xl mr-2">NPR</span>
                                {data?.wallet_balance.toFixed(2) || '0.00'}
                            </h2>

                            <div className="pt-6 border-t border-white/20">
                                <p className="text-sm font-medium text-purple-100">
                                    Secured by Escrow System
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Withdrawal Form */}
                    <Card className="p-6 border-t-4 border-t-purple-500 shadow-md">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <ArrowUpRight className="w-5 h-5 text-purple-600 mr-2" />
                            Withdraw Funds
                        </h3>

                        {withdrawSuccess && (
                            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center text-sm font-medium">
                                <CheckCircle className="w-5 h-5 mr-2" />
                                {withdrawSuccess}
                            </div>
                        )}

                        {withdrawError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm font-medium">
                                <AlertCircle className="w-5 h-5 mr-2" />
                                {withdrawError}
                            </div>
                        )}

                        <form onSubmit={handleWithdrawal} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount (NPR)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">NPR</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        placeholder="0.00"
                                        disabled={isWithdrawing}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWithdrawAmount(String(data?.wallet_balance || 0))}
                                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Max Balance
                                </button>
                            </div>

                            <Button
                                type="submit"
                                disabled={isWithdrawing || !data?.wallet_balance || data.wallet_balance <= 0}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 flex justify-center items-center rounded-xl transition-all disabled:opacity-50"
                            >
                                {isWithdrawing ? (
                                    <span className="flex items-center">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                                        Processing...
                                    </span>
                                ) : (
                                    'Confirm Withdrawal'
                                )}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Right Column (Transactions) */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                <Activity className="w-6 h-6 text-gray-400 mr-2" />
                                Ledger History
                            </h3>
                        </div>

                        <div className="p-6">
                            {!data?.recent_transactions || data.recent_transactions.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-4">
                                        <Activity className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-1">No transactions yet</h4>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                        When you officiate matches, your escrow payments will securely appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {data.recent_transactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-gray-200 transition-all group"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tx.type === 'EARNING' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                                    }`}>
                                                    {tx.type === 'EARNING' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                                                        {tx.type === 'EARNING' ? 'Escrow Release' : 'Withdrawal'}
                                                    </p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <p className="text-xs font-medium text-gray-500">
                                                            {new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                        <p className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-[300px]">
                                                            {tx.note}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`text-right font-bold text-lg ${tx.type === 'EARNING' ? 'text-green-600' : 'text-gray-900'
                                                }`}>
                                                {tx.type === 'EARNING' ? '+' : '-'} NPR {tx.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
};

export default WalletPage;
