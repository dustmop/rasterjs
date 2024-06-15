# Building on Raspberry PI

## Supported Hardware

Any Raspberry Pi versions 1, 2, or 3 should work. The following have been tested and verified to work:

```
|==================|========|
| model            | rev    |
| rpi 1 b+ rev 1.2 | 0010   |
| rpi 2 b rev 1.1  | a21041 |
| rpi 3 b rev 1.2  | a02082 |
| rpi 3 b+ rev 1.3 | a020d3 |
|==================|========|
```

## Supported Operating System

Raspbian Buster: `2020-02-13-raspbian-buster`
> other operating system versions may work, but have not been tested
>
> Rasperry PiOS will not work out of the box. if you want to use it, install the videocore libraries in `/opt/vc`

# Installation

Run on your Raspberry PI:

```
mkdir -p app && cd app
curl -O https://unofficial-builds.nodejs.org/download/release/v18.9.1/node-v18.9.1-linux-armv6l.tar.gz
tar xzvf node-v18.9.1-linux-armv6l.tar.gz
cd ..
echo "PATH=~/app/node-v18.9.1-linux-armv6l/bin:$PATH" >> ~/.bashrc
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

# RGB Matrix with the Adafruit Hat

To compile support for the RGB Matrix with the Adafruit Hat, just clone this library to your RPI's home directory:

```
cd /home/pi
git clone https://github.com/hzeller/rpi-rgb-led-matrix
```
