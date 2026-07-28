import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import UserContext from '../context/UserContext';
import { api } from '../services/api';
import Login from './Login';
import SignUp from './SignUp';

function renderAuthRoute(path, element, contextValue) {
  return render(
    <LanguageProvider>
      <UserContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={element} />
            <Route path="/home" element={<div>Home destination</div>} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </LanguageProvider>
  );
}

describe('authentication forms', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Login validates with Formik and submits valid credentials', async () => {
    const user = { id: 1, username: 'member' };
    const setUser = jest.fn();
    const refreshUser = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(api, 'login').mockResolvedValue(user);

    renderAuthRoute('/login', <Login />, { setUser, refreshUser });

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: ' member ' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(api.login).toHaveBeenCalledWith('member', 'secret123'));
    expect(setUser).toHaveBeenCalledWith(user);
    expect(refreshUser).toHaveBeenCalled();
    expect(await screen.findByText('Home destination')).not.toBeNull();
  });

  test('Sign-up validates with Formik and submits valid account details', async () => {
    const user = { id: 2, username: 'newmember' };
    const setUser = jest.fn();
    const refreshUser = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(api, 'signup').mockResolvedValue(user);

    renderAuthRoute('/SignUp', <SignUp />, { setUser, refreshUser });

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: ' newmember ' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' member@example.com ' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    await waitFor(() => {
      expect(api.signup).toHaveBeenCalledWith(
        'newmember',
        'member@example.com',
        'secret123'
      );
    });
    expect(setUser).toHaveBeenCalledWith(user);
    expect(refreshUser).toHaveBeenCalled();
    expect(await screen.findByText('Home destination')).not.toBeNull();
  });
});
