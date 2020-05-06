import { Component, OnInit, Input } from '@angular/core';

import gql from 'graphql-tag';

import { Apollo } from 'apollo-angular';

import {GET_MY_TODOS} from './TodoPrivateList';

const TOGGLE_TODO = gql`
  mutation toggleTodo ($id: Int!, $isCompleted: Boolean!) {
    update_todos(where: {id: {_eq: $id}}, _set: {is_completed: $isCompleted}) {
      affected_rows
    }
  }
`;

 const ADD_TODO = gql `
  mutation ($todo: String!, $isPublic: Boolean!) {
    insert_todos(objects: {title: $todo, is_public: $isPublic}) {
      affected_rows
      returning {
        id
        title
        created_at
        is_completed
      }
    }
  }
 `;

 const REMOVE_TODO = gql`
   mutation removeTodo ($id: Int!) {
     delete_todos(where: {id: {_eq: $id}}) {
       affected_rows
     }
   }
 `;

@Component({
    selector: 'TodoInput',
    templateUrl: './TodoInput.template.html'
  })

export class TodoInput {
    @Input('isPublic') isPublic: any = false;

    todoInput: any= '';
    loading: boolean = true;

    constructor(private apollo: Apollo) {}

    removeTodo(e) {
        e.preventDefault();
        e.stopPropagation();
        this.apollo.mutate({
          mutation: REMOVE_TODO,
          variables: {id: this.todo.id},
          optimisticResponse: {},
          update: (cache) => {
            const existingTodos: any = cache.readQuery({ query: GET_MY_TODOS });
            const newTodos = existingTodos.todos.filter(t => (t.id !== this.todo.id));
            cache.writeQuery({
              query: GET_MY_TODOS,
              data: {todos: newTodos}
            });
          },
        }).subscribe(({ data, loading }) => {
          console.log('got data', data);
        },(error) => {
          console.log('there was an error sending the query', error);
        });
      };

    addTodo(e) {
      e.preventDefault();
       this.apollo.mutate({
         mutation: ADD_TODO,
         variables: {
           todo: this.todoInput,
           isPublic: this.isPublic
         },

         update: (cache, {data}) => {

          if(this.isPublic) return null;

          const toggleTodo = () => {
            this.apollo.mutate({
              mutation: TOGGLE_TODO,
              variables: {id: this.todo.id, isCompleted: !this.todo.is_completed},
              update: (cache) => {
                const existingTodos : any = cache.readQuery({ query: GET_MY_TODOS });
                const newTodos = existingTodos.todos.map(t => {
                  if (t.id === this.todo.id) {
                    return({...t, is_completed: !t.is_completed});
                  } else {
                    return t;
                  }
                });
                cache.writeQuery({
                  query: GET_MY_TODOS,
                  data: {todos: newTodos}
                });
              },
        }).subscribe(({ data, loading }) => {
          console.log('got data', data);
        },(error) => {
          console.log('there was an error sending the query', error);
        });
      };

          const existingTodos : any = cache.readQuery({
            query: GET_MY_TODOS
          });
          const newTodo = data.insert_todos.returning[0];
          cache.writeQuery({
            query: GET_MY_TODOS,
            data: {todos: [newTodo, ...existingTodos.todos]}
          });

}

       }).subscribe(({ data, loading }) => {
         this.loading = loading;
         this.todoInput = '';
       },(error) => {
         console.log('there was an error sending the query', error);
       });
    }
}
