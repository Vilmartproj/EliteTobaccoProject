import React, { useState } from 'react';

const USER_TYPES = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'admin', label: 'Admin' },
];

export default function RegisterUser({ onRegister, loading }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    userType: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.firstName || !form.lastName || !form.phone || !form.email || !form.address || !form.userType || !form.username || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (!/^[0-9]{10}$/.test(form.phone)) {
      setError('Phone number must be 10 digits.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('Invalid email address.');
      return;
    }
    if (onRegister) {
      // Map frontend fields to backend API
      const payload = {
        username: form.username,
        name: form.firstName + ' ' + form.lastName,
        password: form.password,
        email: form.email,
        phone: form.phone,
        role: form.userType,
        address: form.address // Include address
      };
      onRegister(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 4px 16px #2780e322' }}>
      <h2 style={{ color: '#2780e3', marginBottom: 18 }}>Register User</h2>
      <div style={{ marginBottom: 12 }}>
        <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" maxLength={10} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email ID" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <textarea name="address" value={form.address} onChange={handleChange} placeholder="Address" rows={2} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input name="username" value={form.username} onChange={handleChange} placeholder="Username" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <select name="userType" value={form.userType} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #2780e3', fontSize: 15 }}>
          <option value="">Select User Type</option>
          {USER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {error && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ width: '100%', background: '#2780e3', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}>{loading ? 'Registering...' : 'Register'}</button>
    </form>
  );
}
