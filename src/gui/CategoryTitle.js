let { GuiUtils } = global.export

global.export.CategoryTitle = class {
    constructor(ID, onClick, font_20, font_20_5){
        this.ID = ID
        this.font = font_20
        this.font_bold = font_20_5

        this.colours = {
            "text" : -1,
            "accent": -1
        }

        this.height = 0;
        this.x = 0;
        this.y = 0;

        this.onClick = onClick
        this.selected = false;

        this.interractTimestamp = 0

        this.mouseOver = false;
    }

    Draw(x, y, h, MouseX, MouseY){
        if (this.colours.text === -1) return; 
        this.x = x;
        this.y = y;
        this.height = h;

        this.CheckMouseOver(MouseX, MouseY)

        if (this.selected){
            let barWidth = Math.min((this.Ease((Date.now() - this.interractTimestamp) / 250)) * this.GetWidth(), this.GetWidth())
            GuiUtils.DrawRoundedRect(this.colours.accent, this.x + (this.GetWidth() / 2) - (barWidth / 2), this.y + this.height - 1, barWidth, 1, 1)
        } else {    
            let barWidth = this.GetWidth() - Math.min((this.Ease((Date.now() - this.interractTimestamp) / 250)) * this.GetWidth(), this.GetWidth())
            GuiUtils.DrawRoundedRect(this.colours.accent, this.x + (this.GetWidth() / 2) - (barWidth / 2), this.y + this.height - 1, barWidth, 1, 1)
        }                                           

        let font = this.mouseOver? this.font_bold : this.font
        font.drawString(this.ID, this.x + 10, this.y + (this.height / 2) - (font.getHeight(this.ID) / 2), this.colours.text)
    }

    CheckMouseOver(MouseX, MouseY){
        this.mouseOver = (MouseX > this.x && MouseX < this.x + this.GetWidth()) && (MouseY > this.y && MouseY < this.y + this.height)
    }

    Click(){
        if (this.mouseOver){
            this.onClick()
        }
    }

    GetWidth(){
        return this.font.getWidth(this.ID) + 20
    }

    GetID(){
        return this.ID
    }

    Ease(t) {
        return t * (((1 - t) * t) ** 2) + t ** 3;
    }
}