import React, { useState, useEffect, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { AuthContext } from '../../context/AuthContext';
import TableSkeleton from '../../components/TableSkeleton';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const StudentPayments = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments/student');
      setPayments(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Payments & Billing | Kryntel';
    fetchPayments();
  }, []);

  const handlePayment = async (payment) => {
    const paymentId = payment.id || payment._id;
    setPaying(paymentId);
    
    const res = await loadRazorpayScript();
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      setPaying(null);
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TEwFkiQm9rCHCi', 
      amount: payment.amount * 100, 
      currency: "INR",
      name: "Apex Consulting",
      description: "Consulting Placement Fee",
      image: "/Untitled design (1).png",
      order_id: payment.razorpayOrderId,
      handler: async function (response) {
        try {
          // Verify payment
          await api.post('/payments/verify', {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
          toast.success('Payment successful!');
          fetchPayments();
        } catch (err) {
          console.error(err);
          toast.error('Payment verification failed.');
        }
      },
      prefill: {
        name: user?.name,
        email: user?.email,
        contact: user?.phone || "9999999999"
      },
      theme: {
        color: "#4f46e5" // Indigo-600
      }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on('payment.failed', function (response) {
      toast.error(response.error.description || 'Payment Failed');
    });
    
    paymentObject.open();
    setPaying(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Billing & Payments</h2>
        <p className="text-slate-500 font-medium max-w-2xl">
          View your invoices and pay your placement fees securely via our Razorpay integration.
        </p>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-3xl shadow-sm overflow-hidden relative">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Payment History</h3>
          </div>

          <div className="overflow-x-auto custom-scrollbar -mx-8 px-8">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-4 rounded-l-xl">Order ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-4">
                      <TableSkeleton columns={5} rows={3} />
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500 font-medium">
                      You have no pending or past payments.
                    </td>
                  </tr>
                ) : (
                  payments.map(payment => (
                    <tr key={payment._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-500 font-medium">
                        {payment.razorpayOrderId}
                      </td>
                      <td className="p-4 font-medium text-slate-700">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-black text-slate-900">
                        ₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="p-4">
                        {payment.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Paid
                          </span>
                        ) : payment.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold border border-rose-100/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-100/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {payment.status === 'pending' && (
                          <button
                            onClick={() => handlePayment(payment)}
                            disabled={paying === (payment.id || payment._id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                          >
                            {paying === (payment.id || payment._id) ? 'Opening...' : 'Pay Now'}
                          </button>
                        )}
                        {payment.status === 'completed' && (
                          <span className="text-emerald-500 font-bold text-xs flex items-center justify-end gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPayments;
