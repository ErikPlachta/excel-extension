import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabManageComponent } from './tab-manage.component';

describe('TabManageComponent', () => {
  let component: TabManageComponent;
  let fixture: ComponentFixture<TabManageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabManageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabManageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
