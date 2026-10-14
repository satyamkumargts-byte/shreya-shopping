const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const cartCount = document.querySelector('.cart-count');
const addToCartButtons = document.querySelectorAll('.add-cart');
const filterButtons = document.querySelectorAll('.filter');
const categoryLinks = document.querySelectorAll('[data-category-filter]');
const year = document.getElementById('year');
const newsletterForm = document.querySelector('.newsletter-form');
const newsletterMessage = document.getElementById('newsletterMessage');
const productSearch = document.querySelector('.search-box input');
const productSearchEmpty = document.getElementById('productSearchEmpty');
const checkoutForm = document.getElementById('checkoutForm');
const orderItems = document.getElementById('orderItems');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartShipping = document.getElementById('cartShipping');
const cartTotalDisplay = document.getElementById('cartTotal');
const checkoutSubmit = document.querySelector('.checkout-submit');
const paymentMethod = document.getElementById('paymentMethod');
const paymentDetails = {
  upi: document.getElementById('upiDetails'),
  bank: document.getElementById('bankDetails'),
  cod: document.getElementById('codDetails'),
};
const accountDialog = document.getElementById('accountDialog');
const accountOpen = document.getElementById('accountOpen');
const accountClose = document.getElementById('accountClose');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const accountTabs = document.querySelector('.account-tabs');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotPasswordOpen = document.getElementById('forgotPasswordOpen');
const backToLogin = document.getElementById('backToLogin');
const resetEmail = document.getElementById('resetEmail');
const passwordUpdateForm = document.getElementById('passwordUpdateForm');
const sendPasswordReset = document.getElementById('sendPasswordReset');
const newPassword = document.getElementById('newPassword');
const accountMessage = document.getElementById('accountMessage');
const accountTitle = document.getElementById('accountTitle');
const accountPanel = document.getElementById('accountPanel');
const accountEmail = document.getElementById('accountEmail');
const accountOrders = document.getElementById('accountOrders');
const signOutButton = document.getElementById('signOutButton');
const accountOrderList = document.querySelector('.account-orders');
const checkoutMessage = document.getElementById('checkoutMessage');
const cart = new Map();
let selectedProductFilter = 'all';
const shippingFee = 79;
const freeShippingThreshold = 1999;
const cartStorageKey = 'shreya-shopping-cart-v1';
const phoneInputInstances = new Map();
const phoneInputIds = ['phone', 'signupPhone'];
const supabaseConfig = window.SHREYA_SUPABASE_CONFIG;
const hasSupabaseConfig =
  typeof supabaseConfig?.url === 'string' &&
  supabaseConfig.url.startsWith('https://') &&
  typeof supabaseConfig.anonKey === 'string' &&
  supabaseConfig.anonKey.length > 0 &&
  !supabaseConfig.url.includes('YOUR_SUPABASE_') &&
  !supabaseConfig.anonKey.includes('YOUR_SUPABASE_');
const supabaseClient =
  hasSupabaseConfig && window.supabase?.createClient
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;
if (window.intlTelInput) {
  phoneInputIds.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) {
      return;
    }
    const instance = window.intlTelInput(input, {
      initialCountry: 'in',
      separateDialCode: true,
      loadUtils: () =>
        import('https://cdn.jsdelivr.net/npm/intl-tel-input@29.5.4/dist/js/utils.js'),
    });
    phoneInputInstances.set(input, instance);
    input.addEventListener('input', () => input.setCustomValidity(''));
    input.addEventListener('countrychange', () => input.setCustomValidity(''));
  });
}
let signedInUser = null;
let passwordRecoveryActive = false;

const getPhoneInE164 = async (input) => {
  const instance = phoneInputInstances.get(input);
  if (!instance) {
    throw new Error('Country code selector did not load. Check your internet connection and reload the page.');
  }
  await instance.promise;
  if (!instance.isValidNumber()) {
    input.setCustomValidity('Enter a valid phone number for the selected country.');
    input.reportValidity();
    input.setCustomValidity('');
    throw new Error('Enter a valid phone number for the selected country.');
  }
  return instance.getNumber();
};

const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'INR' ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

const restoreCart = () => {
  let savedItems;
  try {
    savedItems = JSON.parse(window.localStorage.getItem(cartStorageKey) || '[]');
  } catch (error) {
    showCheckoutMessage(`Could not restore your saved cart: ${error.message}`);
    return;
  }
  if (!Array.isArray(savedItems)) {
    showCheckoutMessage('Your saved cart has an invalid format. Add products again to continue.');
    return;
  }

  let hasInvalidItems = false;
  for (const savedItem of savedItems) {
    const card = Array.from(document.querySelectorAll('.product-card')).find(
      (product) => product.querySelector('h3')?.textContent?.trim().toLowerCase() === savedItem?.id,
    );
    const quantity = Number(savedItem?.quantity);
    const name = card?.querySelector('h3')?.textContent?.trim();
    const price = Number(
      (card?.querySelector('.price-row strong')?.textContent || '').replace(/[^\d.]/g, ''),
    );
    if (!card || !name || !Number.isSafeInteger(quantity) || quantity < 1 || price <= 0) {
      hasInvalidItems = true;
      continue;
    }
    cart.set(savedItem.id, { name, price, quantity });
  }
  if (hasInvalidItems) {
    showCheckoutMessage('Some saved cart items are no longer available and were not restored.');
  }
};

const updateCart = () => {
  const quantity = Array.from(cart.values()).reduce((total, item) => total + item.quantity, 0);
  const subtotal = Array.from(cart.values()).reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const shipping = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : shippingFee;

  if (cartCount) {
    cartCount.textContent = String(quantity);
  }
  if (cartSubtotal) {
    cartSubtotal.textContent = formatCurrency(subtotal);
  }
  if (cartShipping) {
    cartShipping.textContent = formatCurrency(shipping);
  }
  if (cartTotalDisplay) {
    cartTotalDisplay.textContent = formatCurrency(subtotal + shipping);
  }
  try {
    window.localStorage.setItem(
      cartStorageKey,
      JSON.stringify(Array.from(cart, ([id, item]) => ({ id, quantity: item.quantity }))),
    );
  } catch (error) {
    showCheckoutMessage(`Your cart is available until this page closes but could not be saved: ${error.message}`);
  }
  if (checkoutSubmit) {
    checkoutSubmit.disabled = quantity === 0;
  }
  if (!orderItems) {
    return;
  }
  orderItems.replaceChildren();
  if (cart.size === 0) {
    const emptyState = document.createElement('p');
    emptyState.textContent = 'Your cart is empty. Add products to get started.';
    orderItems.append(emptyState);
    return;
  }

  for (const [id, item] of cart) {
    const row = document.createElement('div');
    row.className = 'order-item';
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const quantityLabel = document.createElement('span');
    quantityLabel.className = 'order-item-quantity';
    quantityLabel.textContent = `Qty: ${item.quantity}`;
    details.append(name, quantityLabel);

    const controls = document.createElement('div');
    controls.className = 'cart-item-controls';
    const decrement = document.createElement('button');
    decrement.type = 'button';
    decrement.className = 'cart-quantity-button';
    decrement.textContent = '−';
    decrement.setAttribute('aria-label', `Decrease ${item.name} quantity`);
    decrement.addEventListener('click', () => {
      if (item.quantity <= 1) {
        cart.delete(id);
      } else {
        item.quantity -= 1;
      }
      updateCart();
    });
    const increment = document.createElement('button');
    increment.type = 'button';
    increment.className = 'cart-quantity-button';
    increment.textContent = '+';
    increment.setAttribute('aria-label', `Increase ${item.name} quantity`);
    increment.addEventListener('click', () => {
      item.quantity += 1;
      updateCart();
    });
    controls.append(decrement, increment);

    const price = document.createElement('span');
    price.className = 'order-item-price';
    price.textContent = formatCurrency(item.price * item.quantity);
    row.append(details, controls, price);
    orderItems.append(row);
  }
};

const applyProductFilters = () => {
  const query = productSearch?.value.trim().toLowerCase() || '';
  let visibleProducts = 0;
  document.querySelectorAll('.product-card').forEach((card) => {
    const category = card.dataset.category || 'all';
    const matchesCategory =
      selectedProductFilter === 'all' || category === selectedProductFilter;
    const matchesSearch = card.textContent.toLowerCase().includes(query);
    const visible = matchesCategory && matchesSearch;
    card.classList.toggle('is-hidden', !visible);
    if (visible) {
      visibleProducts += 1;
    }
  });
  if (productSearchEmpty) {
    productSearchEmpty.hidden = visibleProducts > 0;
  }
};

const showAccountMessage = (message) => {
  if (accountMessage) {
    accountMessage.textContent = message;
    accountMessage.hidden = false;
  }
};

const showCheckoutMessage = (message) => {
  if (checkoutMessage) {
    checkoutMessage.textContent = message;
    checkoutMessage.hidden = false;
  }
};

const updateAccountUI = (user) => {
  signedInUser = user;
  const isSignedIn = Boolean(user);

  if (accountOpen) {
    accountOpen.textContent = isSignedIn ? 'My account' : 'Log in';
  }
  if (accountTitle) {
    accountTitle.textContent = isSignedIn ? 'Your account' : 'Welcome back';
  }
  if (accountTabs) {
    accountTabs.hidden = isSignedIn;
  }
  if (loginForm) {
    loginForm.hidden = isSignedIn || signupForm?.hidden === false;
  }
  if (forgotPasswordForm) {
    forgotPasswordForm.hidden = true;
  }
  if (passwordUpdateForm) {
    passwordUpdateForm.hidden = true;
  }
  if (signupForm && isSignedIn) {
    signupForm.hidden = true;
  }
  if (accountPanel) {
    accountPanel.hidden = !isSignedIn;
  }
  if (accountOrderList) {
    accountOrderList.hidden = !isSignedIn;
  }
  if (accountEmail) {
    accountEmail.textContent = user?.email || '';
  }
  const emailInput = document.getElementById('emailAddress');
  if (emailInput && user?.email) {
    emailInput.value = user.email;
    emailInput.readOnly = true;
  } else if (emailInput) {
    emailInput.readOnly = false;
  }
};

const loadCustomerOrders = async (user) => {
  if (!supabaseClient || !accountOrders || !user) {
    return;
  }

  accountOrders.replaceChildren();
  const loading = document.createElement('p');
  loading.textContent = 'Loading your orders...';
  accountOrders.append(loading);

  const { data, error } = await supabaseClient
    .from('encrypted_orders')
    .select('id,order_data,encrypted_data,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    accountOrders.replaceChildren();
    const message = document.createElement('p');
    message.textContent = 'Could not load your orders. Please try again later.';
    accountOrders.append(message);
    showAccountMessage(`Could not load orders: ${error.message}`);
    return;
  }

  accountOrders.replaceChildren();
  if (!data?.length) {
    const emptyState = document.createElement('p');
    emptyState.textContent = 'You have not placed any orders yet.';
    accountOrders.append(emptyState);
    return;
  }

  const list = document.createElement('div');
  list.className = 'account-orders-list';
  for (const order of data) {
    const item = document.createElement('article');
    item.className = 'account-order';
    const reference = document.createElement('strong');
    reference.textContent = `Order ${order.id.slice(0, 8)}`;
    const description = document.createElement('p');
    if (order.order_data) {
      const details = order.order_data;
      description.textContent = `${new Date(order.created_at).toLocaleDateString()} · ${formatCurrency(Number(details.total), details.currency || 'USD')} · ${String(details.payment_method || 'payment pending').toUpperCase()} · ${details.status || 'pending'}`;
    } else {
      description.textContent = `${new Date(order.created_at).toLocaleDateString()} · Legacy encrypted order (details unavailable)`;
    }
    item.append(reference, description);
    list.append(item);
  }
  accountOrders.append(list);
};

if (year) {
  year.textContent = new Date().getFullYear();
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      passwordRecoveryActive = true;
    }
    if (!passwordRecoveryActive || event === 'PASSWORD_RECOVERY') {
      updateAccountUI(session?.user || null);
      if (session?.user) {
        const user = session.user;
        window.setTimeout(() => {
          if (signedInUser?.id === user.id) {
            void loadCustomerOrders(user);
          }
        }, 0);
      }
    }
    if (event === 'PASSWORD_RECOVERY') {
      if (accountDialog && !accountDialog.open) {
        accountDialog.showModal();
      }
      if (loginForm) {
        loginForm.hidden = true;
      }
      if (signupForm) {
        signupForm.hidden = true;
      }
      if (accountPanel) {
        accountPanel.hidden = true;
      }
      if (passwordUpdateForm) {
        passwordUpdateForm.hidden = false;
      }
      if (accountTitle) {
        accountTitle.textContent = 'Choose a new password';
      }
      if (newPassword) {
        newPassword.focus();
      }
    }
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      showAccountMessage(`Could not restore your account session: ${error.message}`);
      return;
    }
    if (!passwordRecoveryActive) {
      updateAccountUI(data.session?.user || null);
      if (data.session?.user) {
        void loadCustomerOrders(data.session.user);
      }
    }
  });
}

if (accountDialog && accountOpen && accountClose) {
  accountOpen.addEventListener('click', () => {
    if (passwordRecoveryActive) {
      if (accountTabs) {
        accountTabs.hidden = true;
      }
      if (loginForm) {
        loginForm.hidden = true;
      }
      if (signupForm) {
        signupForm.hidden = true;
      }
      if (accountPanel) {
        accountPanel.hidden = true;
      }
      if (passwordUpdateForm) {
        passwordUpdateForm.hidden = false;
      }
      if (accountTitle) {
        accountTitle.textContent = 'Choose a new password';
      }
    } else if (signedInUser) {
      if (accountTabs) {
        accountTabs.hidden = true;
      }
      if (loginForm) {
        loginForm.hidden = true;
      }
      if (signupForm) {
        signupForm.hidden = true;
      }
      if (accountPanel) {
        accountPanel.hidden = false;
      }
    } else {
      setAccountMode('login');
    }
    accountDialog.showModal();
  });

  accountClose.addEventListener('click', () => {
    accountDialog.close();
  });

  accountDialog.addEventListener('click', (event) => {
    if (event.target === accountDialog) {
      accountDialog.close();
    }
  });
}

const setAccountMode = (mode) => {
  const isSignup = mode === 'signup';
  if (loginForm && signupForm && loginTab && signupTab) {
    loginForm.hidden = isSignup;
    signupForm.hidden = !isSignup;
    loginTab.classList.toggle('active', !isSignup);
    signupTab.classList.toggle('active', isSignup);
    loginTab.setAttribute('aria-pressed', String(!isSignup));
    signupTab.setAttribute('aria-pressed', String(isSignup));
    if (accountTitle) {
      accountTitle.textContent = isSignup ? 'Create your account' : 'Welcome back';
    }
    if (accountTabs) {
      accountTabs.hidden = false;
    }
    if (accountPanel) {
      accountPanel.hidden = true;
    }
    if (loginForm) {
      loginForm.hidden = isSignup;
    }
    if (signupForm) {
      signupForm.hidden = !isSignup;
    }
    if (forgotPasswordForm) {
      forgotPasswordForm.hidden = true;
    }
    if (accountMessage) {
      accountMessage.hidden = true;
      accountMessage.textContent = '';
    }
  }
};

loginTab?.addEventListener('click', () => setAccountMode('login'));
signupTab?.addEventListener('click', () => setAccountMode('signup'));

forgotPasswordOpen?.addEventListener('click', () => {
  const loginEmail = loginForm?.querySelector('input[type="email"]')?.value.trim();
  if (resetEmail && loginEmail) {
    resetEmail.value = loginEmail;
  }
  if (loginForm) {
    loginForm.hidden = true;
  }
  if (signupForm) {
    signupForm.hidden = true;
  }
  if (accountTabs) {
    accountTabs.hidden = true;
  }
  if (forgotPasswordForm) {
    forgotPasswordForm.hidden = false;
  }
  if (accountTitle) {
    accountTitle.textContent = 'Reset your password';
  }
  if (accountMessage) {
    accountMessage.hidden = true;
  }
});

backToLogin?.addEventListener('click', () => {
  if (forgotPasswordForm) {
    forgotPasswordForm.hidden = true;
  }
  setAccountMode('login');
});

forgotPasswordForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient || !resetEmail || !sendPasswordReset) {
    showAccountMessage('Email password recovery is not configured.');
    return;
  }
  if (window.location.protocol === 'file:') {
    showAccountMessage('Open this site over HTTPS or localhost before requesting a password reset link.');
    return;
  }
  sendPasswordReset.disabled = true;
  sendPasswordReset.textContent = 'Sending link...';
  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      resetEmail.value.trim(),
      { redirectTo },
    );
    if (error) {
      throw new Error(error.message);
    }
    showAccountMessage('If an account exists for that email, a password reset link has been sent.');
  } catch (error) {
    showAccountMessage(`Could not send the password reset link: ${error.message}`);
  } finally {
    sendPasswordReset.disabled = false;
    sendPasswordReset.textContent = 'Send reset link';
  }
});

passwordUpdateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient || !passwordRecoveryActive || !newPassword) {
    showAccountMessage('Open a valid password reset link from your email before choosing a new password.');
    return;
  }
  const submitButton = passwordUpdateForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Updating password...';
  }
  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword.value,
    });
    if (error) {
      throw new Error(error.message);
    }
    passwordRecoveryActive = false;
    newPassword.value = '';
    passwordUpdateForm.hidden = true;
    if (accountPanel) {
      accountPanel.hidden = false;
    }
    updateAccountUI(data.user);
    void loadCustomerOrders(data.user);
    showAccountMessage('Your password has been updated.');
  } catch (error) {
    showAccountMessage(`Could not update your password: ${error.message}`);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Update password';
    }
  }
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    showAccountMessage('Account service is not configured. Add your Supabase project URL and anon key in supabase-config.js.');
    return;
  }

  const form = new FormData(loginForm);
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const password = loginForm.querySelector('input[type="password"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    if (error) {
      showAccountMessage(`Could not log in: ${error.message}`);
      return;
    }
    if (data.user) {
      updateAccountUI(data.user);
    }
  } catch (error) {
    showAccountMessage(`Could not log in: ${error.message}`);
  } finally {
    if (password) {
      password.value = '';
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Log in';
    }
  }
});

signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    showAccountMessage('Account service is not configured. Add your Supabase project URL and anon key in supabase-config.js.');
    return;
  }

  const form = new FormData(signupForm);
  let signupPhone;
  try {
    signupPhone = await getPhoneInE164(document.getElementById('signupPhone'));
  } catch (error) {
    showAccountMessage(error.message);
    return;
  }
  const submitButton = signupForm.querySelector('button[type="submit"]');
  const password = signupForm.querySelector('input[type="password"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Creating account...';
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.auth.signUp({
      email: String(form.get('email')),
      password: String(form.get('password')),
      options: {
        data: {
          full_name: String(form.get('name')),
          contact_phone: signupPhone,
        },
      },
    }));
  } catch (requestError) {
    showAccountMessage(`Could not create account: ${requestError.message}`);
    return;
  } finally {
    if (password) {
      password.value = '';
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Create account';
    }
  }
  if (error) {
    const errorDetails = `${error.message || ''} ${error.code || ''}`.toLowerCase();
    if (errorDetails.includes('auth_users_contact_phone_unique_idx')) {
      showAccountMessage('This mobile number is already linked to an account. Log in or use another number.');
    } else if (errorDetails.includes('23505') || errorDetails.includes('duplicate key')) {
      showAccountMessage('This email or mobile number is already associated with an account. Log in or use different details.');
    } else if (
      errorDetails.includes('already registered') ||
      errorDetails.includes('user already exists') ||
      errorDetails.includes('email_exists')
    ) {
      showAccountMessage('This email address is already registered. Log in or reset your password.');
    } else {
      showAccountMessage(`Could not create account: ${error.message}`);
    }
    return;
  }

  if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
    showAccountMessage('An account with this email already exists. Log in or reset your password.');
    return;
  }

  signupForm.reset();
  if (data.session) {
    updateAccountUI(data.user);
    void loadCustomerOrders(data.user);
    showAccountMessage('Account created. You can now place orders and view them in your account.');
  } else {
    setAccountMode('login');
    showAccountMessage('Account created. Confirm your email, then log in to place orders and view your account.');
  }
});

signOutButton?.addEventListener('click', async () => {
  if (!supabaseClient) {
    showAccountMessage('Account service is not configured.');
    return;
  }
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showAccountMessage(`Could not log out: ${error.message}`);
    return;
  }
  passwordRecoveryActive = false;
  setAccountMode('login');
});

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('is-open');
  });
}

addToCartButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.product-card');
    const name = card?.querySelector('h3')?.textContent?.trim();
    const priceText = card?.querySelector('.price-row strong')?.textContent || '';
    const price = Number(priceText.replace(/[^\d.]/g, ''));
    if (!card || !name || !Number.isFinite(price) || price <= 0) {
      showCheckoutMessage('This product could not be added to your cart. Please try again.');
      return;
    }

    const id = name.toLowerCase();
    const existing = cart.get(id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.set(id, { name, price, quantity: 1 });
    }
    updateCart();

    const previousText = button.textContent;
    button.textContent = 'Added to cart';

    setTimeout(() => {
      button.textContent = previousText;
    }, 1000);
  });
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedProductFilter = button.textContent.trim().toLowerCase();
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    applyProductFilters();
  });
});

categoryLinks.forEach((link) => {
  link.addEventListener('click', () => {
    selectedProductFilter = link.dataset.categoryFilter || 'all';
    if (productSearch) {
      productSearch.value = '';
    }
    filterButtons.forEach((button) => {
      const active = button.textContent.trim().toLowerCase() === selectedProductFilter;
      button.classList.toggle('active', active);
    });
    applyProductFilters();
  });
});

productSearch?.addEventListener('input', applyProductFilters);

if (newsletterForm) {
  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (newsletterMessage) {
      newsletterMessage.textContent =
        'Newsletter signup is not connected yet. Your email was not submitted.';
      newsletterMessage.hidden = false;
    }
  });
}

if (paymentMethod) {
  paymentMethod.addEventListener('change', () => {
    Object.entries(paymentDetails).forEach(([method, panel]) => {
      if (panel) {
        panel.hidden = paymentMethod.value !== method;
      }
    });
  });
}

restoreCart();
updateCart();

if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (cart.size === 0) {
      showCheckoutMessage('Your cart is empty. Add at least one product before placing an order.');
      return;
    }
    if (!supabaseClient) {
      showCheckoutMessage('Checkout service is not configured yet. Connect the Supabase project before placing orders.');
      return;
    }

    let authData;
    let authError;
    try {
      ({ data: authData, error: authError } = await supabaseClient.auth.getUser());
    } catch (error) {
      showCheckoutMessage(`Could not verify your account: ${error.message}`);
      return;
    }
    if (authError) {
      showCheckoutMessage(`Could not verify your account: ${authError.message}`);
      return;
    }
    if (!authData.user) {
      showCheckoutMessage('Please log in or create an account before placing an order.');
      if (accountDialog && !accountDialog.open) {
        setAccountMode('login');
        accountDialog.showModal();
      }
      return;
    }
    let checkoutPhone;
    try {
      checkoutPhone = await getPhoneInE164(document.getElementById('phone'));
    } catch (error) {
      showCheckoutMessage(error.message);
      return;
    }

    const submitButton = document.querySelector('.checkout-submit');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving order...';
    }
    if (checkoutMessage) {
      checkoutMessage.hidden = true;
      checkoutMessage.textContent = '';
    }

    const items = Array.from(cart.values()).map(({ name, quantity, price }) => ({
      name,
      quantity,
      price,
    }));

    const address = {
      street: document.getElementById('address').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value.trim(),
      postal_code: document.getElementById('zip').value.trim(),
      country: document.getElementById('country').value.trim(),
      delivery_note: document.getElementById('deliveryNote').value.trim(),
    };
    const subtotal = items.reduce((amount, item) => amount + item.price * item.quantity, 0);
    const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee;
    const total = subtotal + shipping;
    const payload = {
      customer_name: document.getElementById('fullName').value.trim(),
      customer_email: authData.user.email,
      phone: checkoutPhone,
      delivery_address: address,
      items,
      currency: 'INR',
      subtotal,
      shipping,
      total,
      payment_method: paymentMethod?.value,
      status: 'pending',
    };

    let orderData;
    let orderError;
    try {
      ({ data: orderData, error: orderError } = await supabaseClient
        .from('encrypted_orders')
        .insert({
          user_id: authData.user.id,
          order_data: payload,
        })
        .select('id')
        .single());
    } catch (error) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place order';
      }
      showCheckoutMessage(`Could not save your order: ${error.message}`);
      return;
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Place order';
    }
    if (orderError) {
      showCheckoutMessage(`Could not save your order: ${orderError.message}`);
      return;
    }

    const paymentNote =
      payload.payment_method === 'cod'
        ? 'Pay the delivery agent in cash when the order arrives.'
        : 'Payment will be verified manually before dispatch.';
    showCheckoutMessage(`Order ${orderData.id.slice(0, 8)} saved to your account. ${paymentNote}`);
    cart.clear();
    updateCart();
    if (signedInUser) {
      void loadCustomerOrders(signedInUser);
    }
  });
}
