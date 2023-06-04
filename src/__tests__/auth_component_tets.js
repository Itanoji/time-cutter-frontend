import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import App from '../App';
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

test('submits login form', async () => {
    // Мокирование функции для отправки запроса на сервер
    const mockSubmit = jest.fn();

    render(<LoginForm onSubmit={mockSubmit} />);

    // Ввод данных в поля ввода
    const loginInput = screen.getByLabelText('Login');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(loginInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Нажатие на кнопку "Submit"
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    // Ожидание отправки запроса на сервер
    await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
            login: 'testuser',
            password: 'password123',
        });
    });
});