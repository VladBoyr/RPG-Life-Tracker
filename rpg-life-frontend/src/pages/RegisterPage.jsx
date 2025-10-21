import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/apiService';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    character_name: '',
    password: '',
    password2: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');

    if (formData.password !== formData.password2) {
      setErrors({ password2: ["Пароли не совпадают."] });
      return;
    }

    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const finalFormData = { ...formData, timezone: detectedTimezone };
      await registerUser(finalFormData);
      setSuccess('Регистрация прошла успешно! Сейчас вы будете перенаправлены на страницу входа.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (err.response && err.response.data && typeof err.response.data === 'object') {
        setErrors(err.response.data);
      } else {
        setErrors({ general: ["Произошла непредвиденная ошибка. Проверьте соединение с сервером или попробуйте позже."] });
      }
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: 'auto' }}>
      <h2>Регистрация</h2>
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="text" name="username" placeholder="Логин (для входа)" value={formData.username} onChange={handleChange} required />
        {errors.username && <p style={{ color: 'red', margin: 0 }}>{errors.username[0]}</p>}
        
        <input type="text" name="character_name" placeholder="Имя персонажа (отображаемое)" value={formData.character_name} onChange={handleChange} required />
        {errors.character_name && <p style={{ color: 'red', margin: 0 }}>{errors.character_name[0]}</p>}

        <input type="email" name="email" placeholder="Email (необязательно)" value={formData.email} onChange={handleChange} />
        {errors.email && <p style={{ color: 'red', margin: 0 }}>{errors.email[0]}</p>}

        <input type="password" name="password" placeholder="Пароль" value={formData.password} onChange={handleChange} required />
        {errors.password && errors.password.map((error, index) => (
          <p key={index} style={{ color: 'red', margin: 0 }}>{error}</p>
        ))}

        <input type="password" name="password2" placeholder="Повторите пароль" value={formData.password2} onChange={handleChange} required />
        {errors.password2 && <p style={{ color: 'red', margin: 0 }}>{errors.password2[0]}</p>}
        
        {errors.general && <p style={{ color: 'red', margin: 0 }}>{errors.general[0]}</p>}

        <button type="submit">Зарегистрироваться</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
