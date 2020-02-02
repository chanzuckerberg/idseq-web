# Build the assets in a separate stage so we don't need to pack node in our container
FROM node:10.18.1-stretch as asset-builder
WORKDIR /usr/src

# Git needed for github node modules
RUN apk update && apk add git

# Copy files required to install dependencies only for caching
COPY package.json package-lock.json .snyk ./
RUN npm install

# Generate the app's static resources using npm/webpack
# Increase memory available to node to 6GB (from default 1.5GB). At this Travis runs on 7.5GB instances.
ENV NODE_OPTIONS "--max_old_space_size=6144"
# Only copy what is required so we don't need to rebuild when we are only updating the api
COPY app/assets app/assets
COPY webpack.config.common.js webpack.config.prod.js .babelrc ./
# Generate assets
RUN npm run build-img

FROM ruby:2.5-stretch

# Install apt based dependencies required to run Rails as
# well as RubyGems. As the Ruby image itself is based on a
# Debian image, we use apt-get to install those.
RUN apt-get update && apt-get install -y build-essential mysql-client python-dev python-pip apt-transport-https

# Install pip
RUN pip install --upgrade pip

# Install chamber, for pulling secrets into the container.
RUN curl -L https://github.com/segmentio/chamber/releases/download/v2.2.0/chamber-v2.2.0-linux-amd64 -o /bin/chamber
RUN chmod +x /bin/chamber

COPY requirements.txt ./
RUN pip install -r requirements.txt

# Configure the main working directory. This is the base
# directory used in any further RUN, COPY, and ENTRYPOINT
# commands.
WORKDIR /app

# Copy the Gemfile as well as the Gemfile.lock and install
# the RubyGems. This is a separate step so the dependencies
# will be cached unless changes to one of those two files
# are made.
COPY Gemfile Gemfile.lock ./
RUN gem install bundler && bundle install --jobs 20 --retry 5

# Copy assets from asset-builder
COPY --from=asset-builder /usr/src/app/assets/dist app/assets/dist

# Copy the main application.
COPY . ./

ARG GIT_COMMIT
ENV GIT_VERSION ${GIT_COMMIT}

# Expose port 3000 to the Docker host, so we can access it
# from the outside.
EXPOSE 3000

# Configure an entry point, so we don't need to specify
# "bundle exec" or "chamber" for each of our commands.
ENTRYPOINT ["bin/entrypoint.sh"]

# The main command to run when the container starts. Also
# tell the Rails dev server to bind to all interfaces by
# default.
CMD ["rails", "server", "-b", "0.0.0.0", "-p", "3000"]
