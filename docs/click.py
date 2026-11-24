import sys, time
from Xlib import X, display
from Xlib.ext import xtest
d = display.Display(':99')
x, y = int(sys.argv[1]), int(sys.argv[2])
xtest.fake_input(d, X.MotionNotify, x=x, y=y)
d.sync()
time.sleep(0.2)
xtest.fake_input(d, X.ButtonPress, 1)
d.sync()
time.sleep(0.15)
xtest.fake_input(d, X.ButtonRelease, 1)
d.sync()
print('clicked', x, y)
