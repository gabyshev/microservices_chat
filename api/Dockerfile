FROM ruby:2.3.0
MAINTAINER Semyen Gabyshev <gabyshev.sa@gmail.com>

# install necessary packages
RUN apt-get update && apt-get install -y build-essential nodejs

RUN mkdir -p /app
WORKDIR /app

#install gems
COPY Gemfile Gemfile.lock ./
RUN gem install bundler && bundle install --jobs 20 --retry 5

# copy app files to image
COPY . ./

# create and migrate database
RUN rake db:migrate

# run in development mode
EXPOSE 3000
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
