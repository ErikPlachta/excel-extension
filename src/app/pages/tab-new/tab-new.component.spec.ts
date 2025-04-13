import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabNewComponent } from './tab-new.component';

describe('TabNewComponent', () => {
  let component: TabNewComponent;
  let fixture: ComponentFixture<TabNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
