# Building on Raspberry PI

## Supported Hardware

RaspberryPI 1 B+ (revision 1000010 / hardware BCM2835)
> other models may work, but have not yet been tested

## Supported Operating System

Raspbian Buster: `2020-02-13-raspbian-buster`
> other operating system versions may work, but have not been tested
>
> Rasperry PiOS will not work out of the box. if you want to use it, install the videocore libraries in `/opt/vc`

# Installation

Run on your Raspberry PI:

```
mkdir -p app && cd app
curl -O https://unofficial-builds.nodejs.org/download/release/node-v18.9.1-linux-armv6l.tar.gz
tar xzvf node-v18.9.1-linux-armv6l.tar.gz
cd ..
echo "PATH=~/app/node-v18.9.1-linux-armv6l:$PATH" >> ~/.bashrc
source ~/.bashrc
git clone https://github.com/dustmop/rasterjs
```

This does the following:

- downloads an unofficial node.js build v18.9.1
- extract the contents into `app/`
- adds this node interpreter to your `PATH`
- clones this repository

Next, install dependencies for the `node-canvas` npm package (which only used for building gifs, and may be removed in the future):

```
sudo apt-get update --allow-releaseinfo-change
sudo apt-get install build-essential \
  libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev
```

Finally, build the native addon that will use the dispmanx backend:

```
cd rasterjs
npm install
```
