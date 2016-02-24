Rails.application.routes.draw do
  devise_for :users, controllers: {
    sessions: 'users/sessions'
  }

  resources :conversations, only: [:index, :create] do
    resources :messages, only: [:index, :create]
  end
end
