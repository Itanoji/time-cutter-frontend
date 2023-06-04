import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import LoginForm from "../components/Toolbar/components/LoginForm";

test('renders login form', () => {
    render(<LoginForm />);

    // Проверка наличия полей ввода и кнопки
    const loginInput = screen.getByLabelText('Логин');
    const passwordInput = screen.getByLabelText('Пароль');
    const submitButton = screen.getByRole('button', { name: 'Войти' });

    expect(loginInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
});
