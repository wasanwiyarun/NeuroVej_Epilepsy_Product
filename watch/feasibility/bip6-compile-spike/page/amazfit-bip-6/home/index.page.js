import { align, createWidget, text_style, widget } from '@zos/ui'

Page({
  build() {
    createWidget(widget.TEXT, {
      x: 20,
      y: 120,
      w: 350,
      h: 60,
      color: 0xffffff,
      text_size: 30,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: 'Amazfit Bip 6',
    })

    createWidget(widget.TEXT, {
      x: 20,
      y: 200,
      w: 350,
      h: 100,
      color: 0x9ca3af,
      text_size: 22,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: 'Compile feasibility only\nNo medical function',
    })
  },
})
