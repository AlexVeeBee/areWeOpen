FROM node:latest

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# setup yarn
RUN npm install -g yarn

# Install any needed packages specified in package.json
RUN yarn install

# Build the app
RUN yarn build

# list does the dist folder exist
# RUN exist /app/dist || echo "dist folder does not exist" && exit 1

# Run app.js when the container launches
CMD ["node", "dist/index.js"]

# docker build -t areweopen .