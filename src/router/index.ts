import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import CalendarView from '../views/CalendarView.vue';
import ShiftTypeListView from '../views/ShiftTypeListView.vue';
import ShiftTypeEditView from '../views/ShiftTypeEditView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: CalendarView
  },
  {
    path: '/shift-types',
    name: 'ShiftTypeList',
    component: ShiftTypeListView
  },
  {
    path: '/shift-types/new',
    name: 'ShiftTypeNew',
    component: ShiftTypeEditView
  },
  {
    path: '/shift-types/edit/:id',
    name: 'ShiftTypeEdit',
    component: ShiftTypeEditView
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
  },
  {
    path: '/licenses',
    name: 'Licenses',
    component: () => import('../views/LicensesView.vue')
  },
  {
    // Dienstplan-Import (lädt die Texterkennung erst bei Bedarf)
    path: '/import',
    name: 'ScheduleImport',
    component: () => import('../views/ScheduleImportView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
